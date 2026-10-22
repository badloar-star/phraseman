import { peekLearningV2DevUnlockAll, rememberLearningV2DevUnlockAll } from "../learning_v2_dev_unlock_memory";
import { LEARNING_V2_OWNER_EN_TITLES_RU } from "../../components/learning-v2/learningV2OwnerLayout";
import LearningV2ChaptersCourse from "../../components/learning-v2/LearningV2ChaptersCourse";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Platform,
  View,
  Text,
  TouchableOpacity,
  Animated,
  InteractionManager,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// зачем: FadeInDown и withDelay остались без потребителей после снятия входного
// каскада глав и «наливания» кольца прогресса — вкладка открывается статично.
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import TapScale from "../../components/TapScale";
import { useFocusEffect, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useFeatureAccess, usePremium } from "../../components/PremiumContext";
import {
  FREE_LESSON_LIMIT,
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from "../monetization_policy";
import { applyDevAsFreeToLessonAccess } from "../dev_as_free_flag";
import {
  LEVEL_EXAM_UNLOCK_LESSON_PERCENT,
  allLessonScoresMeetPercent,
} from "../lesson_star_scale";
import { openPremiumPaywall } from "../paywall_navigation";
import { lessonPurchaseContinuationParams } from "../paywall_lesson_continuation";
import { HOME_BACK_FALLBACK, safeRouterBack } from "../navigation_back";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
} from "../account_generation";
import { subscribeAppSnapshot, useAppSnapshotSelector } from "../app_snapshot_store";
import { getRunesBalanceRead, peekRunes } from "../runes_system";
import { getStableId, peekStableId } from "../stable_id";
import { projectDevLessonAccess } from "../dev_plus_controls";
import { useTabFocusTick, useTabNav } from "../TabContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../components/ThemeContext";
import { useAccentGraphics } from "../../hooks/use_accent_graphics";
import { useLang } from "../../components/LangContext";
import { useStudyTarget } from "../../components/StudyTargetContext";
import ScreenGradient from "../../components/ScreenGradient";
import { useTopFadeScroll } from "../../components/TopFadeScrollContext";
import { useBouncy, useBouncyStyle } from "../../components/BouncyScrollView";
import { LinearGradient } from "../../components/SafeLinearGradient";
import ListTopEdgeFade from "../../components/lessons/ListTopEdgeFade";
import { triLang, type Lang } from "../../constants/i18n";
import { liquidGlassTokens, type GlassTokens } from "../../constants/liquidGlassThemePalette";
import { perfR1BodyMark, perfR1BodyStart, usePerfR1Probe } from "../perf_r1_probe";
import { isOnboardingDeferActive } from "../onboarding_defer_gate";
import { lessonCardLightSurface, type LessonCardLightSurface } from "../../components/lessons/lessonCardLightSurface";
import { LessonsListGlassCard, type LessonsListCardState } from "../../components/lessons/LessonsListGlassCard";
import { KitGlassLayer } from "../../components/v2/KitLiquidGlass";
import {
  LessonsListGlassAttestationCard,
  LessonsListGlassExamCard,
} from "../../components/lessons/LessonsListGlassExamCards";
import {
  lessonsGlassAlpha,
  lessonsListCopy,
  lessonsListStarCount,
  LessonsListLevelHeader,
} from "../../components/lessons/LessonsListGlassKit";
import {
  GOLD_GRADIENTS,
  GOLD_RICH,
  GOLD_SURFACE_LOCATIONS,
  goldCardGradient,
  goldCefrAccent,
  goldShadow,
} from "../../constants/goldTheme";
import { OLIVE_GRADIENTS, oliveShadow } from "../../constants/oliveTheme";
import { isLightThemeMode, type ThemeMode } from "../../constants/theme";
import GoldBevel from "../../components/GoldBevel";
import { DEV_CONTENT_UNLOCK, ENABLE_DEV_TOOLS, ENABLE_DEV_STUDY_TARGET_LANG } from "../config";
import {
  devStudyTargetsForUiLang,
  emitDevStudyTargetChanged,
  setDevStudyTargetLang,
  type StudyTargetLang,
} from "../study_target_lang_dev";
import { hapticSoftImpact, hapticTap } from "../../hooks/use-haptics";
import { useReduceMotionPreference } from "../../hooks/use_reduce_motion";
import { useTabContentBottomPad } from "../../hooks/use-tab-content-bottom-pad";
import { useRuntimeActive } from "../../hooks/use_runtime_active";
import { useMyCoinRankBinding } from "../../hooks/use_my_coin_rank";
import LearningV2InlineNodeReveal from "../../components/LearningV2InlineNodeReveal";
import LearningV2MapNode from "../../components/LearningV2MapNode";
import type { CoinRewardFlightPoint } from "../../components/rewards/CoinRewardFlight";
import RuneBalanceChip from "../../components/RuneBalanceChip";
import { soundDirector } from "../../modules/audio/sound_director";
import {
  hydrateLearningV2SessionStarResults,
  peekLearningV2SessionStarResults,
  subscribeLearningV2SessionStarResults,
  type LearningV2SessionStarResultsV1,
} from "../learning_v2_session_star_results_store";
import { prefetchLessonMenuCache } from "../lesson_menu";
import { navOnce } from "../nav_once"; // зачем (аудит Optimistic UI Уроков, 13.10): двойной тап по карточке урока
import ReportErrorButton from "../../components/ReportErrorButton";
import { LessonsGateDialog } from "../../components/lessons/LessonsGateDialog";
import { LUM } from "../../constants/motionHybrid";
import { pickLessonsExamStatus } from "../lessons_exam_status";
import LearningV2SessionOutcomeSheet, {
  LEARNING_V2_SESSION_MODAL_EXIT_MS,
} from "../../components/LearningV2SessionOutcomeSheet";
import LearningV2LessonDictionaryOverlayV1 from "../../components/learning-v2/LearningV2LessonDictionaryOverlayV1";
import { useLearningV2CourseUnlockedWordsV1 } from "../../hooks/use_learning_v2_course_unlocked_words_v1";
import { useRequestedFeatureIntro } from "../../hooks/use_requested_feature_intro";
import FeatureIntroModal from "../../components/FeatureIntroModal";
import PressableHybrid from "../../components/PressableHybrid";
import EnergyBar from "../../components/EnergyBar";
import { useEnergy } from "../../components/EnergyContext";
import DialogsTabContent from "../../components/DialogsTabContent";
import PlusBadge from "../../components/PlusBadge";
import { nestedBoxShadow, plateBoxShadow } from "../../components/v2/ShadowSurface";
import { isAiDialogEnabled } from "../ai_dialog_flags";
import {
  getVerifiedPremiumAccessStatus,
  invalidatePremiumCache,
} from "../premium_guard";
import {
  COURSE_LEVEL_RANGES,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  getPreviousCourseLevel,
  type CourseLevel,
} from "../course_levels";
import { featureIntroById } from "../feature_intro_registry";
import { featureIntroLater } from "../feature_intro_copy";
import { lessonNamesForStudyTarget } from "../lesson_titles_for_study_target";
import {
  examContentAvailableForTarget,
  frenchExamGateCopy,
} from "../exam_target_gate";
import { storageStudyTarget } from "../target_storage_keys";
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
  type LessonsTabSnapshot,
} from "../lessons_tab_state";
import { useStableSafeAreaInsets } from "../stable_safe_area_metrics";
import {
  animateNextLayoutShiftWithoutEntryFade,
  animateNextLayoutTransition,
} from "../smooth_layout";
import { peekCurrentExamBestPct } from "../exam_best_pct_overlay";
import { noAndroidOutline } from "../../constants/androidGlow";
import { isValidCoinRank } from "../coin_rank_table_v1";
import { coinRankDisplaySource } from "../../components/coins/coin_rank_display";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  prepareLearningV2CourseAccordionProgressV1,
  type LearningV2AccordionSessionStateV1,
  type LearningV2CourseAccordionRowV1,
} from "../../modules/learning-v2/map/course_accordion_map_model_v1";
import { createLearningV2CourseLocalProgressStoreV1 } from "../../modules/learning-v2/progress/course_local_progress_v1";
import { deriveLocalOfflineProgressAccountScopeHash } from "../../modules/learning-v2/progress/progress_account_scope";
import {
  loadLearningV2ActiveCourseCatalogV1,
  peekLearningV2ActiveCourseCatalogV1,
} from "../learning_v2_active_course_catalog_client_v1";
// зачем: клиент сессии тянет манифест на 1,17 МБ (аудит 20.09, замер по логам:
// открытие раздела держало JS-тред 2612 мс и тапы не доходили). Он нужен только
// при подготовке занятия — грузим лениво, тип импортируем отдельно (тип
// стирается при сборке и веса не добавляет).
import type { LearningV2CourseSessionReadyHandleV3 } from "../learning_v2_course_released_session_client_v3";
import { accentGraphicOf, accentTextSafeOf } from '../../constants/themeAccentRoles';
import {
  markLearningV2SessionLaunchStageV1,
  startLearningV2SessionLaunchTraceV1,
} from "../learning_v2_session_launch_trace_v1";
import BackGlyph from '../../components/v2/BackGlyph';

// Ленивые загрузчики тяжёлых модулей Learning V2.
// Промис кэшируется: модуль парсится ОДИН раз, при первом запуске занятия,
// а не при каждом открытии раздела. Суммарно снимает ~2,2 МБ с входа.
// зачем (R09, координатор 15.10): клиент занятий V3, подготовка, передача «готово» и маршрут занятия живут в
// learning_v2_session_launch_v1 — тем же путём запускает занятие карточка «Продолжить» на Главной (в релизе без передачи
// плеер уходит на карту). Модуль клиента по-прежнему ленивый и кэшируется там.

import type { LearningV2ActiveCourseCatalogV1 } from "../../modules/learning-v2/runtime/course_active_catalog_v1";
import type { LearningV2CourseSessionOutcomeKindV1 } from "../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import { learningV2CourseSessionIdV1 } from "../../modules/learning-v2/content/course_topology_v1";
import { learningV2LessonIsAccessible } from "../learning_v2_access_policy";
import { isLearningV2SessionReleasedV1, LEARNING_V2_HAS_RELEASED_SESSIONS_V1 } from "../learning_v2_session_availability_v1";
import { LEARNING_V2_HIDDEN, isLearningV2OpenForUiLangV1, logLearningV2Hidden } from "../learning_v2_visibility_switch";
import { learningV2SessionTitleV1 } from "../../modules/learning-v2/content/session_titles_v1.generated";
import { rememberLearningV2LastLesson, useLearningV2LastLesson } from "../learning_v2_last_lesson";
import { noteBackArrived, noteBackDecision, noteBackTap } from "../back_tap_probe";
import { learningV2SessionHrefV1, peekLearningV2SessionClientV3, prepareLearningV2SessionRunV1, stageLearningV2ReadyHandoffV1 } from "../learning_v2_session_launch_v1";
import {
  factoryNativeLearningV2AvailabilityV1,
  factoryNativeLearningV2NewWordCountV1,
} from "../../modules/learning-v2/content/factory_native/factory_native_catalog_v1";
import { DebugLogger } from '../debug-logger';
import { noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { useMemHomeRegisterSources } from '../mem_home_probe';

const EXEMPT_COLOR_1 = '#8FA0FF'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_2 = '#B79CFF'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_3 = '#FFD27A'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_4 = '#A95BFF'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_5 = '#FFA245'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_6 = '#FFC894'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_7 = '#5FE8A8'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_8 = '#FF3D6E'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_9 = '#3DE8A6'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_10 = '#9FF2D4'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_11 = '#F2D27A'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_12 = '#2E9DFF'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_13 = '#D6FF3D'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_14 = '#EAFF8C'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_15 = '#4FE8AC'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_16 = '#2EE08C'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_17 = 'rgba(255,255,255,0.45)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_18 = 'rgba(7,17,10,0.2)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_19 = 'rgba(255,255,255,0.24)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_20 = 'rgba(255,255,255,0.55)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_21 = '#B5BABD'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_22 = '#555960'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_23 = 'rgba(247,241,228,0.44)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_24 = 'rgba(255,255,255,0.42)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_25 = 'rgba(255,255,255,0.35)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_26 = 'rgba(184,173,146,0.36)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_27 = 'rgba(255,255,255,0.30)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const EXEMPT_COLOR_28 = 'rgba(255,255,255,0.30)'; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
// зачем (58, сперва замер): когда и кем вычисляется модуль маршрута «Уроки» — на старте роутером или прогревом
// вкладки/тапом. Временно; снять вместе с решением по 58.
// зачем (Авторизация 13.10, аудит скорости): трассировка писала стек в релизной сборке при каждом вычислении модуля — теперь только в dev
if (__DEV__) console.warn('[ROUTE-EVAL] lessons module evaluated', JSON.stringify({ epochMs: Date.now(), stack: String(new Error().stack ?? '').split(String.fromCharCode(10)).slice(1, 9).map((line) => line.trim()) })); // guard-ok: временная трассировка, только dev
/** Снимок UI списка уроков переживает ремоунт push-экрана в рамках ОДНОГО аккаунта.
 *  Штамп поколения дополняет LessonsPaneBoundary retained-вкладки: кэш прежнего
 *  аккаунта не должен мигнуть ни в одном из двух presentation-режимов. */
let lessonsUiSessionCacheByTarget: Partial<Record<string, LessonsTabSnapshot>> =
  {};
let lessonsUiSessionCacheGeneration = -1;

function readLessonsUiSessionCache(
  target: string,
): LessonsTabSnapshot | undefined {
  const generation = captureAccountGeneration().generation;
  if (generation !== lessonsUiSessionCacheGeneration) {
    lessonsUiSessionCacheByTarget = {};
    lessonsUiSessionCacheGeneration = generation;
  }
  return lessonsUiSessionCacheByTarget[target];
}

function writeLessonsUiSessionCache(
  target: string,
  snapshot: LessonsTabSnapshot,
): void {
  lessonsUiSessionCacheGeneration = captureAccountGeneration().generation;
  lessonsUiSessionCacheByTarget[target] = snapshot;
}
/**
 * Единый стиль карточек списка уроков (как «Туман» / «Графит»).
 * Объявлено на уровне модуля (не внутри компонента): имя начинается с `use` — внутри функции
 * Metro/Hermes + Fast Refresh иногда дают «Property 'useSketchLessonVisual' doesn\'t exist».
 */
export const useSketchLessonVisual = true;
const USE_ELITE_LESSONS_MAP = true;
/**
 * Номера уроков курса Learning V2 для словаря всего курса.
 *
 * зачем: владелец 21.09 — словарь в шапке карты показывает слова всего курса.
 * Слова лежат по ключу НА УРОК, значит нужен явный список уроков. Константа
 * модульная, а не собранная в рендере: новая ссылка на каждый рендер сорвала
 * бы мемоизацию скоупа и перезапускала чтение хранилища.
 * 32 — столько же уроков открывает карта (isPulseLessonMapAvailable).
 */
const LEARNING_V2_COURSE_LESSON_ORDINALS: readonly number[] = Object.freeze(
  Array.from({ length: 32 }, (_, index) => index + 1),
);
// ── Список уроков: один стиль «Туман / Графит» (мягкие заливки + чернила) во всех темах приложения ──
const PALETTE_SKETCH: Record<string, string> = {
  A1: "#D4CCBC", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  A2: "#C5BBA8", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  B1: "#B4AA9A", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  B2: "#A19D95", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
};
const LESSON_LEVEL_PALETTES: Record<string, Record<string, string>> = {
  dark: {
    A1: "#B8D6B8", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: "#A7CFB0", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: "#C6D79B", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: "#96BEA0", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  gold: {
    A1: "#F2DFA5", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: "#E6C878", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: "#D0A95B", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: "#B88A45", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  olive: {
    A1: "#D9C98C", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: "#C9A84C", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: "#9E9D69", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: "#77815B", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  // ─── «Чёрное кино» (midnight/ember/aurora/volt) ──────────────────────────
  // Обложки уроков в тон спектру каждой темы (см. constants/cinemaThemes.ts):
  // 4 «голоса» спектра на A1→B2, светлые и насыщенные (далее darkenHex красит
  // фон карточки, lessonAccent=bg — обводку/текст/прогресс). Та же логика, что
  // у dark (Форест) / indigo.
  midnight: {
    A1: EXEMPT_COLOR_1, // accent — электрик-синий
    A2: EXEMPT_COLOR_2, // second — сине-фиолетовый
    B1: EXEMPT_COLOR_3, // gold   — тёплый контраст (как у Форест на B1)
    B2: EXEMPT_COLOR_4, // bloomB — финальный фиолет
  },
  ember: {
    A1: EXEMPT_COLOR_5, // accent — янтарь
    A2: EXEMPT_COLOR_6, // second — светлый янтарь
    B1: EXEMPT_COLOR_7, // correct — мятный контраст
    B2: EXEMPT_COLOR_8, // bloomB — малиновый закат
  },
  aurora: {
    A1: EXEMPT_COLOR_9, // accent — мята
    A2: EXEMPT_COLOR_10, // second — светлая мята
    B1: EXEMPT_COLOR_11, // gold   — тёплый контраст
    B2: EXEMPT_COLOR_12, // bloomB — лазурь
  },
  volt: {
    A1: EXEMPT_COLOR_13, // accent — лайм
    A2: EXEMPT_COLOR_14, // second — светлый лайм
    B1: EXEMPT_COLOR_15, // correct — изумрудный контраст
    B2: EXEMPT_COLOR_16, // bloomB — зелёный
  },
};
const EXAM_META_SKETCH: Record<
  string,
  {
    bg: string;
    accent: string;
  }
> = {
  A1: { bg: "#3F3D39", accent: "#F3F0E8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  A2: { bg: "#353638", accent: "#ECEFF3" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  B1: { bg: "#2C3035", accent: "#E5E9EF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  B2: { bg: "#242932", accent: "#EEF2F8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
};
const EXAM_META_BY_THEME: Record<string, typeof EXAM_META_SKETCH> = {
  olive: {
    A1: { bg: "#202417", accent: "#F4ECD8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#1B2013", accent: "#E3CC88" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#161B11", accent: "#C9A84C" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#11150D", accent: "#B9BF96" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  dark: {
    A1: { bg: "#344637", accent: "#E2F4E3" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#304333", accent: "#DDF2E1" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#41472D", accent: "#F0F7D7" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#2F3F34", accent: "#D9EFDF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  // ─── «Чёрное кино» — плашки зачётов в тон спектру (см. cinemaThemes.ts) ───
  // bg: тёмная подложка с подтоном спектра; accent: светлый голос спектра.
  midnight: {
    A1: { bg: "#1B1F36", accent: "#C9D2FF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#232948", accent: "#D8CCFF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#2A2B3F", accent: "#FFE3B0" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#26203F", accent: "#D9B5FF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  ember: {
    A1: { bg: "#281B10", accent: "#FFD9A8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#332215", accent: "#FFE6C9" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#1F2A1C", accent: "#BFF5DA" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#33161F", accent: "#FFB5C4" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  aurora: {
    A1: { bg: "#15241C", accent: "#9FF2CF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#1C2F24", accent: "#C7F7E5" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#2A2A1C", accent: "#F7E6B0" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#162636", accent: "#A8D8FF" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
  volt: {
    A1: { bg: "#20250E", accent: "#EFFF9E" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    A2: { bg: "#2A3013", accent: "#F4FFC4" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B1: { bg: "#16251C", accent: "#B5F5D8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    B2: { bg: "#1A2A1E", accent: "#A8F0C8" }, // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  },
};
function cefrKey(num: number): string {
  if (num <= 8) return "A1";
  if (num <= 18) return "A2";
  if (num <= 28) return "B1";
  return "B2";
}
const LESSON_TONE_STEPS = [
  0.94, 1, 0.97, 1.04, 0.92, 0.99, 1.06, 0.95, 1.02, 0.98,
];
function scaleHex(hex: string, factor = 1): string {
  const r = Math.max(
    0,
    Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor)),
  );
  const g = Math.max(
    0,
    Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor)),
  );
  const b = Math.max(
    0,
    Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor)),
  );
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
function lessonToneFactor(num: number): number {
  const level = getCourseLevelForLesson(num);
  const [firstLesson] = COURSE_LEVEL_RANGES[level];
  return LESSON_TONE_STEPS[(num - firstLesson) % LESSON_TONE_STEPS.length] ?? 1;
}
/** Токены, нужные палитре уровней: чернила уровня (читаются на плашке ≥ 4,5) и признак светлой темы. */
type LevelInkTokens = Pick<GlassTokens, "levelA1" | "levelA2" | "levelB1" | "levelB2" | "isLight">;
function bookPalette(num: number, themeMode = "indigo", glass?: LevelInkTokens): string {
  // зачем (Темы R1_THEMEMODE_LEGACY_MAP, координатор 12.10): themeMode всегда 'dark', и карточки уровней A1–B2 были зелёными пастелями на любой
  // теме. Цвет уровня берём из токенов активной темы (любой оттенок ползунка, тёмная и светлая): `levelXX` — тон темы со сдвигом оттенка
  // по ступени и контрастом ≥ 4,5 к поверхности. Ступень тона урока (LESSON_TONE_STEPS) применяем только в сторону БОЛЬШЕГО контраста:
  // для тёмных токенов чернила светлые — только светлее (для светлых — только темнее); порог 4,5 от токена не теряется.
  // Экран передаёт токены ТЕМНОГО оформления: карточка урока всегда тёмная (см. levelInkGlass).
  if (glass) {
    const ink = glass[`level${cefrKey(num)}` as "levelA1" | "levelA2" | "levelB1" | "levelB2"];
    const step = lessonToneFactor(num);
    return scaleHex(ink, glass.isLight ? Math.min(1, step) : Math.max(1, step));
  }
  const palette = LESSON_LEVEL_PALETTES[themeMode] ?? PALETTE_SKETCH;
  const base = palette[cefrKey(num)] ?? PALETTE_SKETCH[cefrKey(num)];
  return scaleHex(base, lessonToneFactor(num));
}
function darkenHex(hex: string, factor = 0.45): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}
function lightenHex(hex: string, factor = 1.3): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
  return `rgb(${r},${g},${b})`;
}
function rgbaHex(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
// Кеш результатов darkenHex и rgbaHex — детерминированные функции, результат постоянный.
const _darkenCache = new Map<string, string>();
const _rgbaCache = new Map<string, string>();

function darkenHexCached(hex: string, factor: number): string {
  const k = `${hex}:${factor}`;
  let v = _darkenCache.get(k);
  if (!v) {
    v = darkenHex(hex, factor);
    _darkenCache.set(k, v);
  }
  return v;
}
function rgbaHexCached(hex: string, alpha: number): string {
  const k = `${hex}:${alpha}`;
  let v = _rgbaCache.get(k);
  if (!v) {
    v = rgbaHex(hex, alpha);
    _rgbaCache.set(k, v);
  }
  return v;
}
// ── Medal images ────────────────────────────────────────────────────────────
const MEDAL_IMAGES: Record<string, any> = {
  bronze: require("../../assets/images/levels/bronza.webp"),
  silver: require("../../assets/images/levels/serebro.webp"),
  gold: require("../../assets/images/levels/zoloto.webp"),
  ruby: require("../../assets/images/levels/rubin.webp"),
  emerald: require("../../assets/images/levels/izumrud.webp"),
  diamond: require("../../assets/images/levels/almaz.webp"),
};
function MedalDots({ dots }: { dots: string[] }) {
  if (dots.length === 0) return null;
  const SIZE = 22;
  const OFFSET = 14;
  const totalW = SIZE + (dots.length - 1) * OFFSET;
  return (
    <View style={{ width: totalW, height: SIZE }}>
      {dots.map((key, i) => (
        <Image
          key={i}
          source={MEDAL_IMAGES[key]}
          style={{
            position: "absolute",
            left: i * OFFSET,
            width: SIZE,
            height: SIZE,
            zIndex: dots.length - i,
          }}
          contentFit="contain"
        />
      ))}
    </View>
  );
}
function LessonExamThemeIcon({
  themeMode: _themeMode,
  size,
  label,
}: {
  themeMode: ThemeMode;
  size: number;
  label: string;
}) {
  const { theme: t } = useTheme();
  return (
    <View accessible accessibilityLabel={label} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Ionicons name="school-outline" size={Math.round(size * 0.78)} color={t.accentText} />
    </View>
  );
}
/**
 * Маленькая золотая плашка «Premium» в правом верхнем углу карточки урока.
 * Показывается только на уроках, закрытых именно за пейволом (premiumRequired),
 * а не за прогрессом/уровнем — там остаётся обычный замочек.
 */
// Высоты элементов (должны точно совпадать с реальным рендером)
const BOOK_H = 72; // высота книги
const LESSON_CARD_WHITE_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.50)", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};
const LESSON_CARD_ACCENT_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.46)", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};
const LESSON_CARD_FILLED_META_TEXT = "#07110A"; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
const LESSON_CARD_OPEN_META_TEXT = LESSON_CARD_FILLED_META_TEXT;

interface TabUnderlineButtonProps {
  label: string;
  /** зачем (бэклог №18, съёмка learn-003/004): робот переключает вкладку «Уроки | Диалоги | V2» по testID — выбор вкладки теперь запоминается. */
  testID?: string;
  active: boolean;
  color: string;
  mutedColor: string;
  accent: string;
  fontSize: number;
  onPress: () => void;
  badge?: boolean;
  badgeColor?: string;
  badgeTextColor?: string;
  badgeLabel?: string;
  plusBadge?: boolean;
  plusBadgeLabel?: string;
  themeMode: ThemeMode;
}

/**
 * Вкладка-надпись переключателя «Уроки | Диалоги»: у активной вкладки снизу —
 * золотая полоска-дуга с выгибом вниз («улыбка»), без отдельной плашки.
 * Цвет акцента приходит от темы (золото / accent). Неактивная — чистый текст.
 */
function TabUnderlineButton({
  label,
  active,
  color,
  mutedColor,
  accent,
  fontSize,
  onPress,
  badge,
  badgeColor,
  badgeTextColor,
  badgeLabel,
  plusBadge,
  plusBadgeLabel,
  themeMode,
  testID,
}: TabUnderlineButtonProps) {
  // Дуга шириной по содержимому: оцениваем по длине надписи (моноширинного API нет).
  const arcWidth = Math.max(
    44,
    Math.round(label.length * Math.max(14, fontSize) * 0.62),
  );
  const arcHeight = 9;
  // Квадратичная кривая, прогнутая вниз: концы выше центра → «улыбка».
  const arcPath = `M2 2 Q${arcWidth / 2} ${arcHeight - 1} ${arcWidth - 2} 2`;
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingTop: plusBadge ? 5 : 10,
        paddingBottom: 12,
        alignItems: "center",
        position: "relative",
      }}
    >
      {plusBadge ? (
        <PlusBadge
          themeMode={themeMode}
          size="xs"
          showIcon={false}
          label={plusBadgeLabel ?? "Plus"}
          style={{ alignSelf: "center", marginBottom: 2 }}
        />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={{
            color: active ? color : mutedColor,
            fontSize: Math.max(14, fontSize),
            fontWeight: active ? "800" : "600",
          }}
        >
          {label}
        </Text>
        {badge && badgeLabel ? (
          <View
            style={{
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 1,
              backgroundColor: badgeColor ?? accent,
            }}
          >
            <Text
              style={{
                color: badgeTextColor ?? "#fff", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
                fontSize: 13,
                fontWeight: "700",
              }}
              maxFontSizeMultiplier={1}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
      {active ? (
        <Svg
          width={arcWidth}
          height={arcHeight}
          viewBox={`0 0 ${arcWidth} ${arcHeight}`}
          style={{ position: "absolute", bottom: 2 }}
        >
          <Path
            d={arcPath}
            stroke={accent}
            strokeWidth={2.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </TouchableOpacity>
  );
}

// ── LessonCard — мемоизированный тайл урока ──────────────────────────────────
interface LessonCardProps {
  num: number;
  name: string;
  isUnlocked: boolean;
  bg: string;
  darkBg: string;
  progPct: number;
  isComplete: boolean;
  isCurrent: boolean;
  lessonLevel: CourseLevel;
  lessonGoldLevel: ReturnType<typeof goldCefrAccent>;
  lessonAccent: string;
  prevLessonLevel: CourseLevel | null;
  levelLockedByExam: boolean;
  premiumRequired: boolean;
  purchasedLesson: boolean;
  showLessonProgressFill: boolean;
  cardRadius: number;
  lockedCardBaseColor: string;
  cardLayerStyle: {
    position: "absolute";
    left: number;
    top: number;
    right: number;
    bottom: number;
    borderRadius: number;
    overflow: "hidden";
  };
  lessonTextColor: string;
  lessonMetaColor: string;
  // внешние props из замыкания
  isGoldTheme: boolean;
  themeMode: ThemeMode;
  goldSurface: string;
  goldHairline: string;
  goldAntique: string;
  goldBright: string;
  scaleAnim: null;
  lang: Lang;
  f: ReturnType<typeof import("../../components/ThemeContext").useTheme>["f"];
  openLessonPaywall: (lessonNum: number) => void;
  setGateModal: React.Dispatch<
    React.SetStateAction<
      | null
      | { kind: "exam"; level: string }
      | { kind: "lesson"; prevNum: number; lessonNum: number }
      | { kind: "levelGate"; level: string; prevLevel: string; lessonNum: number }
      | { kind: "frenchExam"; level: string }
      | { kind: "premium"; lessonNum: number }
    >
  >;
  router: ReturnType<typeof import("expo-router").useRouter>;
  studyTarget: string;
  isPremium: boolean;
  effectiveDevContentUnlock: boolean;
  noLimits: boolean;
  legacyFreeLessonCap: number;
  textPrimary: string;
  textMuted: string;
  learningV2?: boolean;
  learningV2Expanded?: boolean;
  learningV2InProgress?: boolean;
  onLearningV2PressIn?: (lessonOrdinal: number) => void;
  onLearningV2Press?: (lessonOrdinal: number) => void;
  /** Светлая плашка (решение владельца 12.10, п.81 (11)): цвета из токенов светлого оформления; null — прежняя тёмная. */
  lightSurface?: LessonCardLightSurface | null;
}

// зачем (R1 L1, координатор 12.10): renderLessonCard собирал для каждой плашки НОВЫЙ объект стиля слоя и новую стрелку нажатия — React.memo у LessonCard
// видел другие ссылки и перерисовывал плашку на каждом коммите корня. Стиль слоя зависит только от радиуса (14/16) — кэшируем по радиусу;
// обёртка нажатия кэшируется по самой функции-источнику (WeakMap) — тот же вход даёт ту же ссылку.
const LESSON_CARD_LAYER_STYLES = new Map<number, LessonCardProps["cardLayerStyle"]>();
function lessonCardLayerStyle(radius: number): LessonCardProps["cardLayerStyle"] {
  let style = LESSON_CARD_LAYER_STYLES.get(radius);
  if (!style) {
    style = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius, overflow: "hidden" };
    LESSON_CARD_LAYER_STYLES.set(radius, style);
  }
  return style;
}
const LESSON_CARD_PRESS_WRAPPERS = new WeakMap<() => void, () => void>();
function lessonCardPressWrapper(source: () => void): () => void {
  let wrapper = LESSON_CARD_PRESS_WRAPPERS.get(source);
  if (!wrapper) {
    wrapper = () => source();
    LESSON_CARD_PRESS_WRAPPERS.set(source, wrapper);
  }
  return wrapper;
}

/** Тени карточек уроков: только iOS (см. зачем у стиля карточки). */
const LESSON_CARD_SHADOWS_ENABLED = Platform.OS !== "android";

const LessonCard = React.memo(function LessonCard({
  num,
  name,
  isUnlocked,
  bg,
  darkBg,
  progPct,
  isComplete,
  isCurrent,
  lessonLevel,
  lessonGoldLevel,
  lessonAccent,
  prevLessonLevel,
  levelLockedByExam,
  premiumRequired,
  purchasedLesson,
  showLessonProgressFill,
  cardRadius,
  lockedCardBaseColor,
  cardLayerStyle,
  lessonTextColor,
  lessonMetaColor,
  isGoldTheme,
  themeMode: _themeMode,
  goldSurface: _gs,
  goldHairline,
  goldAntique,
  goldBright,
  scaleAnim,
  lang,
  f,
  openLessonPaywall,
  setGateModal,
  router,
  studyTarget,
  isPremium,
  effectiveDevContentUnlock,
  noLimits,
  legacyFreeLessonCap,
  textPrimary: _tp,
  textMuted,
  learningV2 = false,
  learningV2Expanded = false,
  learningV2InProgress = false,
  onLearningV2PressIn,
  onLearningV2Press,
  lightSurface = null,
}: LessonCardProps) {
  // зачем (решение владельца 12.10, п.81 (11), «карточки уроков при светлом оформлении — светлые»): themeMode всегда 'dark', поэтому прежняя светлая ветка (по themeMode) была мертва.
  // Светлая плашка включается пропом `lightSurface` (токены светлого оформления активной темы), а не названием темы.
  const lightCard = lightSurface;
  const isSagePorcelainCard = isLightThemeMode(_themeMode) || lightCard !== null;
  const isOliveTheme = _themeMode === "olive";
  const lockedCardHasLightFill = isLightThemeMode(_themeMode) || lightCard !== null;
  // зачем: 100% прогресс заливает ВСЮ ширину карточки градиентом [bg, lightenHex(bg,1.28)] —
  // текст «УРОК N» стоит у левого края (start x:0), т.е. фактически на САМОМ bg без lighten.
  // Аудит нашёл пограничный случай: midnight B2 (тон 0.92, bg #9B54EB) даёт тёмному тексту
  // #07110A контраст 4.445:1 — чуть ниже нормы AA 4.5:1. Порог по luminance страхует именно
  // эти редкие тёмно-фиолетовые/тёмно-синие bg: тёмный текст включаем только если сам bg
  // светлее условной границы (≈0.5 relative luminance), иначе остаётся светлый вариант.
  const bgLuminance = (() => {
    const r = parseInt(bg.slice(1, 3), 16) / 255;
    const g = parseInt(bg.slice(3, 5), 16) / 255;
    const b2 = parseInt(bg.slice(5, 7), 16) / 255;
    const ch = (v: number) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b2);
  })();
  const useFilledMetaText =
    isComplete && showLessonProgressFill && bgLuminance > 0.45;
  // зачем (аудит-фикс): было `!isGoldTheme && isUnlocked` —
  // включало тёмный текст (#07110A, без тени) на ЛЮБОЙ разблокированной не-gold/
  // теме, включая indigo/dark/midnight и т.п. Но базовый градиент карточки
  // там ВСЕГДА тёмный (см. cardLayerStyle ниже) — тёмный текст без тени на нём
  // давал контраст ~1.0-1.3:1 (норма 4.5). Только sagePorcelain реально светлая;
  // остальные темы получают тёмный текст лишь когда прогресс-фон под ним
  // гарантированно светлый (100%, см. useFilledMetaText выше).
  const useDarkMetaText = isSagePorcelainCard || useFilledMetaText;
  // Цвет мелкого текста плашки на светлой заливке: из токенов (открытая — text, закрытая — приглушённый ≥ 4,5); прежняя тёмная ветка — константа.
  const metaInk = lightCard ? (isUnlocked ? lightCard.text : lightCard.lockedText) : LESSON_CARD_OPEN_META_TEXT;
  // зачем: карточка раскрывалась «телепортом» — на тап не было НИКАКОГО отклика
  // (scaleAnim приходит null), экран просто подменялся. Отклик живёт на
  // UI-потоке (Reanimated): палец получает реакцию в том же кадре, до любой
  // навигации и до чтения диска, поэтому задержки не добавляет ни на грамм.
  // Утопление намеренно мягкое (0.975) — это большая карточка, а не иконка;
  // резкий TapScale-масштаб для мелких элементов здесь смотрелся бы дёшево.
  const pressProgress = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressProgress.value * 0.025 }],
  }));
  const onCardPressIn = useCallback(() => {
    pressProgress.value = withTiming(1, {
      duration: 110,
      easing: Easing.out(Easing.quad),
    });
    if (learningV2) onLearningV2PressIn?.(num);
  }, [learningV2, num, onLearningV2PressIn, pressProgress]);
  const onCardPressOut = useCallback(() => {
    pressProgress.value = withSpring(0, { damping: 18, stiffness: 260 });
  }, [pressProgress]);
  return (
    <Reanimated.View style={pressStyle}>
      <Animated.View
        style={{
          marginTop: 5,
          marginHorizontal: 14,
          borderRadius: cardRadius,
          transform: [{ scale: scaleAnim ?? 1 }],
          // зачем (замер Q53 на слабом Android: «Обучение» p50 23 мс): тень с elevation под
          // скруглённой обрезкой у КАЖДОЙ карточки — самая дорогая часть прокрутки, а на тёмном
          // стекле 2.0 её почти не видно. На Android тени у карточек нет; iOS — как было.
          ...(LESSON_CARD_SHADOWS_ENABLED ? {
          shadowColor: isGoldTheme ? "#000" : darkenHexCached(bg, 0.28), // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
          shadowOffset: {
            width: 0,
            height: isCurrent ? 7 : isUnlocked ? 4 : 2,
          },
          shadowOpacity: USE_ELITE_LESSONS_MAP
            ? isCurrent
              ? 0.2
              : isUnlocked
                ? 0.11
                : 0.05
            : useSketchLessonVisual
              ? isUnlocked
                ? 0.14
                : 0.08
              : isUnlocked
                ? 0.28
                : 0.15,
          shadowRadius: USE_ELITE_LESSONS_MAP
            ? isCurrent
              ? 14
              : isUnlocked
                ? 9
                : 4
            : useSketchLessonVisual
              ? isUnlocked
                ? 10
                : 5
              : isUnlocked
                ? 8
                : 4,
          elevation: isCurrent ? 8 : isUnlocked ? 6 : 2,
          ...(isGoldTheme
            ? goldShadow(isCurrent ? 2 : 1)
            : isOliveTheme
              ? oliveShadow(isCurrent ? 2 : 1)
              : {}),
          } : null),
        }}
      >
        <TouchableOpacity
          testID={`lessons-row-${num}`}
          accessibilityState={
            learningV2 ? { expanded: learningV2Expanded } : undefined
          }
          activeOpacity={0.82}
          onPressIn={onCardPressIn}
          onPressOut={onCardPressOut}
          onPress={() => {
            hapticTap();
            if (learningV2) {
              onLearningV2Press?.(num);
              return;
            }
            // зачем (координатор 05.10): dev-флаг «как Free» подменяет только isPremium/devMode (в релизе — без изменений).
            const accessInput = applyDevAsFreeToLessonAccess({
              lessonId: num,
              unlocked: isUnlocked,
              purchased: purchasedLesson,
              isPremium,
              devMode: effectiveDevContentUnlock,
              noLimits,
              legacyFreeLessonCap,
            }, 'lessons_card');
            const access = resolveLessonAccess(accessInput);
            logLessonGateDecision('card', {
              lesson: num, access, isPremium: accessInput.isPremium, devMode: accessInput.devMode ?? false, noLimits, purchased: purchasedLesson,
              unlocked: isUnlocked, cap: legacyFreeLessonCap ?? null, levelLockedByExam: Boolean(levelLockedByExam && prevLessonLevel),
            });
            if (access === "available") {
              // зачем (аудит R58 #17, 15.10): двойной тап открывал меню урока дважды (два экрана в стеке) — тот же замок, что и в списке.
              if (!navOnce(`lessons:menu:${num}`)) return;
              void prefetchLessonMenuCache(num, studyTarget);
              router.push({ pathname: "/lesson_menu", params: { id: num } });
            } else if (access === "premium_required") {
              openLessonPaywall(num);
            } else if (levelLockedByExam && prevLessonLevel) {
              setGateModal({
                kind: "levelGate",
                level: lessonLevel,
                prevLevel: prevLessonLevel,
                lessonNum: num,
              });
            } else {
              setGateModal({ kind: "lesson", prevNum: num - 1, lessonNum: num });
            }
          }}
          style={{
            // Authored titles and 200% system text may need extra rows. Keep
            // the original footprint as a minimum and let the card reflow.
            // зачем: владелец 20.09 — «плашки должны выглядеть так же как в
            // Learning V1, а не быть такими высокими (но индикатор круговой
            // должен остаться)». Высоту распирали три вещи, и все три сняты:
            // 108 → BOOK_H (72), кольцо 48 → 34, заголовок в 3 строки → 2.
            minHeight: BOOK_H,
            borderRadius: cardRadius,
            overflow: "hidden",
            backgroundColor: isUnlocked ? "transparent" : lockedCardBaseColor,
            // зачем («Тень» 12.10): обводка карточки урока (золото / шалфей / элитная карта / эскиз) убрана — контейнеры без обводок;
            // карточку отделяют градиентная заливка слоёв и тень обёртки (shadow* выше)
          }}
        >
          {/* Card background */}
          {isUnlocked ? (
            <LinearGradient
              colors={
                isGoldTheme
                  ? isCurrent
                    ? goldCardGradient("selected")
                    : lessonGoldLevel.card
                  : isOliveTheme
                    ? isCurrent
                      ? OLIVE_GRADIENTS.selectedPanel
                      : OLIVE_GRADIENTS.raisedPanel
                    : lightCard
                      ? [lightCard.fill[0], lightCard.fill[1], lightCard.fill[2]]
                    : isSagePorcelainCard
                      ? [bg, lightenHex(bg, 1.08), lightenHex(bg, 1.14)]
                      : [
                          darkenHexCached(bg, 0.52),
                          darkBg,
                          darkenHexCached(bg, 0.38),
                        ]
              }
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={cardLayerStyle}
            />
          ) : levelLockedByExam ? (
            <LinearGradient
              colors={
                isGoldTheme
                  ? goldCardGradient("muted")
                  : isOliveTheme
                    ? OLIVE_GRADIENTS.quietPanel
                    : lightCard
                      ? [lightCard.lockedFill[0], lightCard.lockedFill[1], lightCard.lockedFill[2]]
                    : isSagePorcelainCard
                      ? [lightenHex(bg, 1.04), bg, lightenHex(bg, 1.1)]
                      : [
                          darkenHexCached(bg, 0.36),
                          darkenHexCached(bg, 0.31),
                          darkenHexCached(bg, 0.26),
                        ]
              }
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[cardLayerStyle, { opacity: isGoldTheme ? 0.68 : 1 }]}
            />
          ) : (
            <LinearGradient
              colors={
                isGoldTheme
                  ? GOLD_GRADIENTS.mutedPanel
                  : lightCard
                    ? [lightCard.lockedFill[0], lightCard.lockedFill[1], lightCard.lockedFill[2]]
                  : isSagePorcelainCard
                    ? [lightenHex(bg, 1.02), bg, lightenHex(bg, 1.08)]
                    : [
                        darkenHexCached(bg, 0.3),
                        darkenHexCached(bg, 0.25),
                        darkenHexCached(bg, 0.2),
                      ]
              }
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={cardLayerStyle}
            />
          )}
          {isGoldTheme && (
            <LinearGradient
              colors={[
                rgbaHexCached(lessonAccent, isUnlocked ? 0.22 : 0.08),
                "rgba(0,0,0,0)", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
                rgbaHexCached(lessonAccent, isCurrent ? 0.2 : 0.1),
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cardLayerStyle}
            />
          )}
          {isGoldTheme && (
            <GoldBevel
              radius={cardRadius}
              intensity={isCurrent ? "strong" : isUnlocked ? "normal" : "quiet"}
            />
          )}
          {/* Progress fill */}
          {/* зачем (Макеты 18.10, design/c2_all_lessons): градиент был растянут на ширину прогресса — при 7 % весь переход
              «тон карточки → яркий» сжимался в узкую полосу, и её яркий край ложился прямо под «УРОК 1» / название (полоса
              «поверх» текста). Теперь градиент рисуется на ВСЮ ширину карточки, а показывается только доля прогресса (клип):
              на малом проценте видно тёмное начало, на большом — прежний вид. */}
          {showLessonProgressFill && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progPct}%`,
                overflow: "hidden",
                borderTopLeftRadius: cardRadius,
                borderBottomLeftRadius: cardRadius,
                borderTopRightRadius: cardRadius,
                borderBottomRightRadius: cardRadius,
              }}
            >
            <LinearGradient
              colors={
                isGoldTheme
                  ? ([goldAntique, goldBright, lessonAccent] as [
                      string,
                      string,
                      string,
                    ])
                  : lightCard
                    ? [lightCard.progress[0], lightCard.progress[1]]
                    : [bg, lightenHex(bg, 1.28)]
              }
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                // ширина всей карточки внутри клипа шириной progPct %
                width: `${(100 / Math.max(progPct, 1)) * 100}%`,
                opacity: isGoldTheme
                  ? levelLockedByExam
                    ? 0.16
                    : 0.22
                  : levelLockedByExam
                    ? 0.28
                    : 1,
              }}
            />
            </View>
          )}
          {/* Subtle inner highlight on filled part top edge */}
          {showLessonProgressFill && (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: `${progPct}%`,
                height: 1.5,
                // зачем: на светлой sagePorcelain белая кромка прогресса невидима —
                // тонируем акцентом урока, как границу карточки выше.
                backgroundColor: isGoldTheme
                  ? GOLD_RICH.hairlineStrong
                  : lightCard
                    ? lightCard.edge
                  : isSagePorcelainCard
                    ? rgbaHexCached(lessonAccent, 0.38)
                    : useSketchLessonVisual
                      ? EXEMPT_COLOR_17
                      : "rgba(255,255,255,0.3)", // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
                opacity: levelLockedByExam ? 0.24 : 1,
                borderTopLeftRadius: cardRadius,
                borderTopRightRadius: cardRadius,
              }}
            />
          )}
          {/* Content */}
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 18, paddingVertical: 12 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: useDarkMetaText
                    ? metaInk
                    : lessonMetaColor,
                  fontSize: f.label,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  ...(useDarkMetaText ? {} : LESSON_CARD_ACCENT_TEXT_SHADOW),
                }}
              >
                {triLang(lang, {
                  ru: `УРОК ${num}`,
                  en: `LESSON ${num}`,
                  uk: `УРОК ${num}`,
                  es: `LECCIÓN ${num}`,
                  "pt-BR": `LIÇÃO ${num}`,
                  vi: `BÀI ${num}`,
                  id: `PELAJARAN ${num}`,
                  tr: `DERS ${num}`,
                  pl: `LEKCJA ${num}`,
                })}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {learningV2 ? (
                  <View
                    testID={`learning-v2-lesson-progress-ring-${num}`}
                    accessible
                    accessibilityLabel={`${progPct}%`}
                    // Кольцо 34 вместо 48: в плашке высотой 72 кольцо 48
                    // распирало строку. Цифра процента внутри остаётся видимой.
                    style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
                  >
                    <Svg width={34} height={34} viewBox="0 0 34 34" style={{ position: "absolute" }}>
                      <Circle cx={17} cy={17} r={14} fill="none" stroke={useDarkMetaText ? EXEMPT_COLOR_18 : EXEMPT_COLOR_19} strokeWidth={4} />
                      {progPct > 0 ? (
                        <Circle
                          cx={17}
                          cy={17}
                          r={14}
                          fill="none"
                          stroke={useDarkMetaText ? metaInk : lessonMetaColor}
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeDasharray={`${(progPct / 100) * 87.96} 87.96`}
                          rotation={-90}
                          origin="17,17"
                        />
                      ) : null}
                    </Svg>
                    {learningV2InProgress ? (
                      <Ionicons
                        name="construct-outline"
                        size={15}
                        color={useDarkMetaText ? metaInk : lessonMetaColor}
                      />
                    ) : isComplete ? (
                      <Ionicons name="checkmark" size={15} color={useDarkMetaText ? metaInk : lessonMetaColor} />
                    ) : (
                      <Text style={{ color: useDarkMetaText ? metaInk : lessonMetaColor, fontSize: 13, fontWeight: "700" }}>{progPct}%</Text>
                    )}
                  </View>
                ) : purchasedLesson ? (
                  <Text
                    style={{
                      color: useDarkMetaText ? metaInk : lessonMetaColor,
                      fontSize: f.label,
                      fontWeight: "800",
                      ...(useDarkMetaText ? {} : LESSON_CARD_ACCENT_TEXT_SHADOW),
                    }}
                  >
                    {triLang(lang, {
                      ru: "Куплено",
                      en: "Purchased",
                      uk: "Придбано",
                      es: "Comprada",
                      "pt-BR": "Comprada",
                      vi: "Đã mua",
                      id: "Dibeli",
                      tr: "Satın alındı",
                      pl: "Kupiono",
                    })}
                  </Text>
                ) : premiumRequired ? (
                  <PlusBadge
                    themeMode={_themeMode}
                    label={triLang(lang, {
                      ru: "Plus",
                      en: "Plus",
                      uk: "Plus",
                      es: "Plus",
                      "pt-BR": "Plus",
                      vi: "Plus",
                      id: "Plus",
                      tr: "Plus",
                      pl: "Plus",
                    })}
                  />
                ) : !isUnlocked ? (
                  <Ionicons
                    name="lock-closed"
                    size={14}
                    color={
                      isGoldTheme
                        ? rgbaHexCached(lessonAccent, 0.64)
                        : lockedCardHasLightFill
                          ? darkenHexCached(bg, 0.4)
                          : EXEMPT_COLOR_20
                    }
                    style={LESSON_CARD_ACCENT_TEXT_SHADOW}
                  />
                ) : USE_ELITE_LESSONS_MAP && isComplete ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={lessonAccent}
                    style={LESSON_CARD_ACCENT_TEXT_SHADOW}
                  />
                ) : progPct > 0 ? (
                  <Text
                    style={{
                      // зачем: процент красился в rgbaHex(lessonAccent) — а lessonAccent === bg
                      // карточки, то есть цветом фона по фону: читалась только чёрная тень
                      // под глифом («размыто» на всех темах). Берём тот же контрастный цвет,
                      // что и метка «УРОК N» слева, и тень оставляем лишь светлому тексту.
                      color: useDarkMetaText
                        ? metaInk
                        : lessonMetaColor,
                      fontSize: f.label,
                      fontWeight: "800",
                      ...(useDarkMetaText
                        ? {}
                        : LESSON_CARD_ACCENT_TEXT_SHADOW),
                    }}
                  >
                    {progPct}%
                  </Text>
                ) : null}
              </View>
            </View>
            {/* зачем: заголовок разливался на три строки и тянул плашку вверх
                независимо от minHeight — это и была главная причина «слишком
                высоких» плашек. Две строки держат высоту 72, а многоточие
                владелец запретил, поэтому кегль чуть меньше, а не обрезка. */}
            <Text
              style={{
                color: lessonTextColor,
                fontSize: learningV2 ? f.body - 2 : f.body,
                lineHeight: learningV2 ? f.body + 2 : undefined,
                fontWeight: "700",
                ...(isSagePorcelainCard ? {} : LESSON_CARD_WHITE_TEXT_SHADOW),
              }}
            >
              {name}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Reanimated.View>
  );
});

// ── Главный компонент ─────────────────────────────────────────────────────────
type LessonsTabProps = {
  overlayIdentityEpoch?: number;
  presentation?: "tab" | "push";
  initialPage?: "lessons" | "v2";
};

// зачем: владелец 2026-09-13 закрыл курс Learning V2 от людей, пока он не
// дописан. Правило состоит из ДВУХ разных частей, и путать их нельзя:
//
//   1. ВХОД в уроки ВСЕГДА открывает старые уроки — и в релизе, и в дев-сборке
//      (`initialPage = "lessons"` ниже, безусловно). Первая попытка привязала
//      вход к дев-флагу, и у владельца в деве по-прежнему открывался курс.
// Владелец 2026-09-19 открыл Learning V2 для раннего релиза: карты всех уроков
// можно изучать, а незавершённость показывается значком ремонта на самих уроках
// и сессиях. Дев-кнопка массовой разблокировки остаётся отдельной и релизной
// доступностью не управляет.
//
// зачем (владелец 11.10: «ВСЁ ПОПАДАЕТ В СБОРКУ! LEARNING V2 ПОПАДАЕТ!!!», курс виден всем сразу, без серверного ключа):
// вырез 10.10 снят — маршруты курса и занятия входят в стор-сборку (router.ctx.js режет только дев-экраны V2). Доступ к
// урокам решает learning_v2_access_policy (бесплатные уроки / Plus).
// зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): вход в курс есть, только если хоть одно
// занятие реально открывается (app/learning_v2_session_availability_v1.ts) — без пустых экранов и тупиков. Дев-сборка
// входит всегда: там проверяют невыпущенные занятия кнопкой массовой разблокировки.
// зачем (план Б 16.10, координатор 14.10): рубильник «V2 скрыт» — одна строка в learning_v2_visibility_switch.ts закрывает
// кнопку «V2», чип «Новые уроки», запомненную вкладку V2 и initialPage="v2" маршрута курса, в том числе в дев-сборке.
const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = !LEARNING_V2_HIDDEN && (LEARNING_V2_HAS_RELEASED_SESSIONS_V1 || ENABLE_DEV_TOOLS);
if (LEARNING_V2_HIDDEN) logLearningV2Hidden("lessons_tab_v2_entries", "lessons", "hidden=v2_button,new_lessons_chip,remembered_tab");

// зачем (владелец 17.10: «вкладка Обучения будет открывать конкретно именно новые уроки, а не старые, а старые уроки будут открываться отдельной кнопочкой»;
// отменяет решения 13.09 «вход открывает старые уроки» и 13.10 «вкладки Уроки | V2 с памятью выбора»): корневая вкладка «Обучение» при каждом входе открывается
// на карте V2, без запомненного выбора; старый список — по кнопке «Классический курс» на карте. Отдельный маршрут /lessons_list (плитка «Уроки» на Главной,
// выходы из старых уроков) остаётся на старом списке — туда возвращаются те, кто был в старом уроке. Память выбора вкладки удалена: иначе у людей
// со старой записью «v2» этот маршрут молча прыгал бы на карту.
type LessonsTabsPage = "lessons" | "v2";
// зачем (R92, координатор 17.10): доступность курса приходит параметром — кроме рубильника и выпущенных занятий она зависит от языка
// интерфейса (пояснения курса есть только на ru/uk); при другом языке вкладка открывает классический курс.
function startLessonsPage(initial: LessonsTabsPage, presentation: "tab" | "push", learningV2CanOpen: boolean): "lessons" | "dialogs" | "v2" {
  // зачем (координатор 13.10, план Б R1): маршрут learning-v2/course в стор-сборке не вырезан и передаёт initialPage="v2" — без
  // выпущенных занятий (потолок бандла 0) раздел V2 не открывается и по прямой ссылке: человек попадает в список уроков.
  if (initial === "v2" && !learningV2CanOpen) {
    console.warn(`[V2-ROUTE] reason=${LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? "ui_lang_without_v2" : "ceiling0"} — курс V2 недоступен, открываю список уроков`); // guard-ok: ранний выход
    return "lessons";
  }
  const start: LessonsTabsPage = initial === "lessons" && presentation === "tab" && learningV2CanOpen ? "v2" : initial;
  console.log(`[LESSONS-TABS] вход: presentation=${presentation} initialPage=${initial} v2Доступен=${String(learningV2CanOpen)} (рубильник+выпуск=${String(LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY)}) → старт=${start}`); // guard-ok: итог выбора стартовой страницы
  return start;
}


const LEARNING_V2_SESSION_STATE_ICON: Readonly<
  Record<
    LearningV2AccordionSessionStateV1,
    React.ComponentProps<typeof Ionicons>["name"]
  >
> = Object.freeze({
  completed: "checkmark",
  current: "star",
  next: "sparkles",
  locked: "lock-closed",
});

// зачем (координатор 12.10): запасной текст «чему научишься» (когда каталог курса не дал свой) был только русским;
// теперь на 9 языков. Каждый новый гость проходит урок 1 сразу после онбординга, поэтому это первый выпуск.
function neutralLearningV2SessionOutcome(sessionOrdinal: number, lang: Lang): string {
  if (sessionOrdinal <= 4) {
    return triLang(lang, {
      ru: 'Ты поймёшь, как am, is и are превращают отдельные слова в законченную фразу.',
      uk: 'Ти зрозумієш, як am, is і are перетворюють окремі слова на закінчений вислів.',
      en: 'You will see how am, is and are turn separate words into a whole phrase.',
      es: 'Entenderás cómo am, is y are convierten palabras sueltas en una frase completa.',
      "pt-BR": 'Você vai entender como am, is e are transformam palavras soltas em uma frase completa.',
      vi: 'Bạn sẽ hiểu cách am, is và are biến những từ rời rạc thành một câu hoàn chỉnh.',
      id: 'Kamu akan paham bagaimana am, is, dan are mengubah kata-kata lepas menjadi frasa utuh.',
      tr: 'am, is ve are’in tek tek kelimeleri nasıl tam bir cümleye dönüştürdüğünü anlayacaksın.',
      pl: 'Zrozumiesz, jak am, is i are zamieniają pojedyncze słowa w pełne zdanie.',
    });
  }
  if (sessionOrdinal <= 8) {
    return triLang(lang, {
      ru: 'Ты научишься собирать простые фразы с глаголом to be.',
      uk: 'Ти навчишся складати прості вислови з дієсловом to be.',
      en: 'You will learn to build simple phrases with the verb to be.',
      es: 'Aprenderás a formar frases sencillas con el verbo to be.',
      "pt-BR": 'Você vai aprender a montar frases simples com o verbo to be.',
      vi: 'Bạn sẽ học cách ghép những câu đơn giản với động từ to be.',
      id: 'Kamu akan belajar menyusun frasa sederhana dengan kata kerja to be.',
      tr: 'to be fiiliyle basit cümleler kurmayı öğreneceksin.',
      pl: 'Nauczysz się układać proste zdania z czasownikiem to be.',
    });
  }
  return triLang(lang, {
      ru: 'Ты сможешь без подсказки применять am, is и are в разговоре.',
      uk: 'Ти зможеш без підказки використовувати am, is і are в розмові.',
      en: 'You will be able to use am, is and are in conversation without hints.',
      es: 'Podrás usar am, is y are en una conversación sin ayuda.',
      "pt-BR": 'Você vai conseguir usar am, is e are em uma conversa, sem dicas.',
      vi: 'Bạn sẽ dùng được am, is và are khi trò chuyện mà không cần gợi ý.',
      id: 'Kamu akan bisa memakai am, is, dan are dalam percakapan tanpa petunjuk.',
      tr: 'am, is ve are’i ipucu olmadan konuşmada kullanabileceksin.',
      pl: 'Będziesz umieć używać am, is i are w rozmowie bez podpowiedzi.',
    });
}

function neutralLearningV2SessionOutcomeKind(
  sessionOrdinal: number,
): LearningV2CourseSessionOutcomeKindV1 {
  if (sessionOrdinal <= 4) return "understand";
  if (sessionOrdinal <= 8) return "learn";
  return "can_do";
}

// зачем (learn-3/4/8, «сперва логи»): строки из рендера печатаются ОДИН раз на комбинацию ключа — без спама на каждый кадр.
const lessonsLoggedKeys = new Set<string>();
function logOncePerKey(tag: string, key: string, payload: Record<string, unknown>): void {
  const fullKey = `${tag}|${key}`;
  if (lessonsLoggedKeys.has(fullKey)) return;
  lessonsLoggedKeys.add(fullKey);
  console.warn(tag, JSON.stringify(payload)); // guard-ok: временная трассировка learn-3/4/8, один раз на комбинацию
}

// зачем (learn-(1), Дизайн/координатор 05.10: «Free видит "Ещё рано" вместо пейвола» — потеря выручки, «сперва логи»): каждое
// решение ворот урока печатает все входы resolveLessonAccess и что показано. devMode = DEV_CONTENT_UNLOCK снимает
// Plus-ветку в dev-сборке — его значение в строке обязательно. Без uid.
// зачем (learn-5, координатор 05.10: «окно ворот открывается медленно — лог времени от тапа до показа»): отметка
// последнего тапа, который может открыть окно ворот. Эффект открытия окна печатает tap→commit и tap→кадр, чтобы
// отделить задержку кода от собственной анимации HybridAlertShell (~74+380 мс до полной непрозрачности).
let lessonsGateTapAtMs: number | null = null;
function markLessonsGateTap(): void {
  lessonsGateTapAtMs = Date.now();
}

function logLessonGateDecision(
  source: 'card' | 'list',
  input: Readonly<{
    lesson: number; access: string; isPremium: boolean; devMode: boolean; noLimits: boolean;
    purchased: boolean; unlocked: boolean; cap: number | null; levelLockedByExam: boolean;
  }>,
): void {
  markLessonsGateTap();
  const shown = input.access === 'available' ? 'lesson_menu'
    : input.access === 'premium_required' ? 'paywall'
      : input.levelLockedByExam ? 'gate_level' : 'gate_lesson_too_early';
  console.warn('[LESSON-GATE] decision', JSON.stringify({
    source, ...input, requiresPremium: requiresPremiumForLesson(input.lesson, input.cap ?? undefined), shown,
  })); // guard-ok: решение ворот (выручка) логируется и в релизе; только чтение флагов, ничего не меняет
}

function learningV2SessionOutcomeTitle(
  kind: LearningV2CourseSessionOutcomeKindV1,
  lang: Lang,
): string {
  if (kind === "understand") {
    return triLang(lang, {
      ru: "Что ты поймёшь",
      en: "What you'll understand",
      uk: "Що ти зрозумієш",
      es: "Qué entenderás",
      "pt-BR": "O que você vai entender",
      vi: "Bạn sẽ hiểu gì",
      id: "Yang akan kamu pahami",
      tr: "Ne anlayacaksın",
      pl: "Co zrozumiesz",
    });
  }
  if (kind === "learn") {
    return triLang(lang, {
      ru: "Чему научишься",
      en: "What you'll learn",
      uk: "Чого ти навчишся",
      es: "Qué aprenderás",
      "pt-BR": "O que você vai aprender",
      vi: "Bạn sẽ học gì",
      id: "Yang akan kamu pelajari",
      tr: "Ne öğreneceksin",
      pl: "Czego się nauczysz",
    });
  }
  return triLang(lang, {
    ru: "Что сможешь делать",
    en: "What you'll be able to do",
    uk: "Що ти зможеш робити",
    es: "Qué podrás hacer",
    "pt-BR": "O que você conseguirá fazer",
    vi: "Bạn sẽ làm được gì",
    id: "Yang akan bisa kamu lakukan",
    tr: "Ne yapabileceksin",
    pl: "Co będziesz umieć zrobić",
  });
}

function learningV2NewWordCountLabel(count: number | null, lang: Lang): string {
  if (count === null) {
    return triLang(lang, {
      ru: "Новые слова по ходу",
      uk: "Нові слова в процесі",
      en: "New words included",
      es: "Palabras nuevas incluidas",
      "pt-BR": "Novas palavras incluídas",
      vi: "Có từ mới",
      id: "Kata baru tersedia",
      tr: "Yeni kelimeler var",
      pl: "Nowe słowa w środku",
    });
  }
  const ruWord = count % 10 === 1 && count % 100 !== 11
    ? "новое слово" // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? "новых слова" // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
      : "новых слов"; // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
  const ukWord = count % 10 === 1 && count % 100 !== 11
    ? "нове слово" // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? "нові слова" // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
      : "нових слів"; // i18n-ok: формы «N новых слов» для ru/uk, остальные языки в triLang ниже
  return triLang(lang, {
    ru: `${count} ${ruWord}`,
    uk: `${count} ${ukWord}`,
    en: `${count} new ${count === 1 ? "word" : "words"}`,
    es: `${count} ${count === 1 ? "palabra nueva" : "palabras nuevas"}`,
    "pt-BR": `${count} ${count === 1 ? "palavra nova" : "palavras novas"}`,
    vi: `${count} từ mới`,
    id: `${count} kata baru`,
    tr: `${count} yeni kelime`,
    pl: `${count} ${count === 1 ? "nowe słowo" : "nowych słów"}`,
  });
}

type LearningV2InlineMapRowV1 = Extract<
  LearningV2CourseAccordionRowV1,
  { kind: "chapter" | "session" }
>;

const LearningV2InlineMapRow = React.memo(function LearningV2InlineMapRow({
  row,
  lang,
  theme,
  fonts,
  reduceMotion,
  runtimeActive,
  devUnlockAll,
  isPremium,
  earnedStars,
  onSessionPress,
  onSessionCompleted,
}: Readonly<{
  row: LearningV2InlineMapRowV1;
  lang: Lang;
  theme: ReturnType<typeof useTheme>["theme"];
  fonts: ReturnType<typeof useTheme>["f"];
  reduceMotion: boolean;
  /** useRuntimeActive(ownerVisible) таба «Уроки» — гейт дыхания текущего узла. */
  runtimeActive: boolean;
  /** DEV-only presentation override; не изменяет learner progress или registry. */
  devUnlockAll: boolean;
  /** Free включает первые два полных урока V2; с урока 3 нужен Plus. */
  isPremium: boolean;
  /** Звёзды 0–3 за пройденную сессию (витрина, без авторитета). */
  earnedStars?: 0 | 1 | 2 | 3;
  onSessionPress: (
    lessonOrdinal: number,
    sessionOrdinal: number,
    state: LearningV2AccordionSessionStateV1,
  ) => void;
  onSessionCompleted?: (point: CoinRewardFlightPoint) => void;
}>) {
  const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder (в тёмном ≈ accent, вид не меняется)
  if (row.kind === "chapter") {
    return (
      <View
        style={{
          marginHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingTop: row.chapterOrdinal === 1 ? 14 : 20,
          paddingBottom: 10,
        }}
      >
        <Text
          style={{
            color: theme.accentText,
            fontSize: fonts.label,
            fontWeight: "900",
            letterSpacing: 1.2,
          }}
        >
          {triLang(lang, {
            ru: "ГЛАВА",
            en: "CHAPTER",
            uk: "РОЗДІЛ",
            es: "CAPÍTULO",
            "pt-BR": "CAPÍTULO",
            vi: "CHƯƠNG",
            id: "BAB",
            tr: "BÖLÜM",
            pl: "ROZDZIAŁ",
          })}{" "}
          {row.chapterOrdinal}
        </Text>
        <View
          style={{ height: 1, flex: 1, backgroundColor: theme.border }}
        />
      </View>
    );
  }

  const current = row.state === "current";
  const completed = row.state === "completed";
  const devUnlocked = devUnlockAll && !current && !completed;
  const premiumLocked = !learningV2LessonIsAccessible(row.lessonOrdinal, isPremium);
  const accessible = !premiumLocked && (devUnlockAll || current || completed);
  const checkpoint =
    row.role === "chapter_checkpoint" || row.role === "final_exam";
  const label =
    row.role === "final_exam"
      ? triLang(lang, {
          ru: "Итоговый экзамен",
          en: "Final exam",
          uk: "Підсумковий іспит",
          es: "Examen final",
          "pt-BR": "Prova final",
          vi: "Bài thi cuối",
          id: "Ujian akhir",
          tr: "Final sınavı",
          pl: "Egzamin końcowy",
        })
      : row.role === "chapter_checkpoint"
        ? triLang(lang, {
            ru: "Проверка главы",
            en: "Chapter checkpoint",
            uk: "Перевірка розділу",
            es: "Repaso del capítulo",
            "pt-BR": "Revisão do capítulo",
            vi: "Kiểm tra chương",
            id: "Cek bab",
            tr: "Bölüm kontrolü",
            pl: "Sprawdzian rozdziału",
          })
        : `${triLang(lang, {
            ru: "Сессия",
            en: "Session",
            uk: "Сесія",
            es: "Sesión",
            "pt-BR": "Sessão",
            vi: "Buổi",
            id: "Sesi",
            tr: "Oturum",
            pl: "Sesja",
          })} ${row.sessionOrdinal}`;
  const wave = [-72, -34, 20, 70, 86, 52, 4, -48][
    (row.sessionOrdinal - 1) % 8
  ];
  // зачем: подпись под кружком (владелец 20.09 — «каждая сессия должна быть
  // названа»). Имя берём только там, где оно реально написано (уроки 1–3);
  // для ненаписанных показываем номер и ничего не выдумываем.
  // План курса написан по-русски, переводов названий занятий пока нет.
  // Показывать русский текст в английском интерфейсе нельзя — там номер.
  const authoredTitle =
    lang === "ru"
      ? learningV2SessionTitleV1(row.lessonOrdinal, row.sessionOrdinal)
      : null;
  const sessionTitle =
    authoredTitle ??
    `${triLang(lang, {
      ru: "Занятие",
      en: "Session",
      uk: "Заняття",
      es: "Sesión",
      "pt-BR": "Sessão",
      vi: "Buổi",
      id: "Sesi",
      tr: "Oturum",
      pl: "Zajęcia",
    })} ${row.sessionOrdinal}`;
  // зачем: «плоский объём как у Duolingo» (владелец, 22.08) — площадка-эллипс
  // шире, чем выше, + цоколь 6px; размеры согласованы с макетом каталога движения.
  // зачем (владелец 22.08, правка после первого показа): узлы обязаны быть
  // КРУГЛЫМИ. В первой версии «плоского объёма» ширина была больше высоты
  // (58x48) — получался овал. Ширина === высота, радиус = половина.
  const nodeSize = checkpoint ? 62 : current ? 68 : 54;
  const nodeW = nodeSize;
  const nodeH = nodeSize;
  const nodeR = checkpoint ? 20 : nodeSize / 2;
  const faceColor = current
    ? theme.accent
    : completed
      ? theme.correct
      : devUnlocked
        ? theme.bgCard
        : theme.bgSurface2;
  const revealIndex = row.sessionOrdinal + row.chapterOrdinal - 1;

  return (
    <View
      testID={`learning-v2-inline-map-row-${row.lessonOrdinal}-${row.sessionOrdinal}`}
      style={{
        marginHorizontal: 14,
        paddingBottom: row.sessionOrdinal === 56 ? 18 : 0,
      }}
    >
      <LearningV2InlineNodeReveal
        index={revealIndex}
        // Высота строки держит самый крупный случай: круг 68 + цоколь 6 +
        // отступ 8 + звёзды 9 = 91. Резерв постоянный, поэтому появление
        // звёзд результата не двигает карту.
        height={checkpoint ? 104 : 94}
        reduceMotion={reduceMotion}
      >
        <LearningV2MapNode
          state={row.state}
          width={nodeW}
          height={nodeH}
          radius={nodeR}
          faceColor={faceColor}
          haloColor={current ? accentGfx.border : undefined}
          accessible={accessible}
          active={runtimeActive}
          reduceMotion={reduceMotion}
          accessibilityLabel={`${label}, ${
            accessible
              ? triLang(lang, {
                  ru: "доступна",
                  en: "available",
                  uk: "доступна",
                  es: "disponible",
                  "pt-BR": "disponível",
                  vi: "đang mở",
                  id: "terbuka",
                  tr: "açık",
                  pl: "dostępna",
                })
              : triLang(lang, {
                  ru: "закрыта",
                  en: "locked",
                  uk: "закрита",
                  es: "bloqueada",
                  "pt-BR": "bloqueada",
                  vi: "đang khoá",
                  id: "terkunci",
                  tr: "kilitli",
                  pl: "zablokowana",
                })
          }${
            completed && !checkpoint && earnedStars !== undefined
              ? `, ${earnedStars} ${triLang(lang, {
                  ru: "из 3 звёзд",
                  en: "out of 3 stars",
                  uk: "з 3 зірок",
                  es: "de 3 estrellas",
                  "pt-BR": "de 3 estrelas",
                  vi: "trên 3 sao",
                  id: "dari 3 bintang",
                  tr: "/ 3 yıldız",
                  pl: "z 3 gwiazdek",
                })}`
              : ""
          }`}
          onPress={() =>
            onSessionPress(row.lessonOrdinal, row.sessionOrdinal, row.state)
          }
          onCompletedTransition={onSessionCompleted}
          style={{
            transform: [{ translateX: wave }],
            opacity: premiumLocked || (row.state === "locked" && !devUnlocked) ? 0.78 : 1,
          }}
        >
          {checkpoint ? (
            <Ionicons
              name="trophy"
              size={26}
              color={
                current || completed
                  ? (current ? theme.textOnGold : theme.correctText)
                  : devUnlocked
                    ? theme.accent
                    : theme.gold
              }
            />
          ) : completed ? (
            <Ionicons
              name={LEARNING_V2_SESSION_STATE_ICON.completed}
              size={22}
              color={theme.correctText}
            />
          ) : row.state === "locked" && !devUnlocked ? (
            <Ionicons
              name={LEARNING_V2_SESSION_STATE_ICON.locked}
              size={18}
              color={theme.textMuted}
            />
          ) : (
            <Text
              style={{
                color: current
                  ? theme.textOnGold
                  : devUnlocked
                    ? theme.accent
                    : theme.textPrimary,
                fontSize: current ? 22 : 16,
                fontWeight: "700",
              }}
            >
              {row.sessionOrdinal}
            </Text>
          )}
        </LearningV2MapNode>
        {completed && !checkpoint && earnedStars !== undefined ? (
          // зачем (спека mock 08): три звезды результата под пройденным узлом.
          // Место под них зарезервировано всегда (высота строки не зависит от
          // наличия результата), поэтому появление звёзд не двигает карту.
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              top: nodeH + 8,
              left: 0,
              width: nodeW,
              transform: [{ translateX: wave }],
              flexDirection: "row",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {[0, 1, 2].map((slot) => (
              <Ionicons
                key={slot} // guard-ok: три фиксированных слота, вставок нет
                name={slot < earnedStars ? "star" : "star-outline"}
                size={9}
                color={slot < earnedStars ? theme.accentText : theme.textMuted}
              />
            ))}
          </View>
        ) : null}
        {!checkpoint ? (
          // зачем: владелец 20.09 — «каждый кружок с названием», и текст не
          // снизу, а сбоку: слева или справа, смотря к какому краю телефона
          // ближе кружок. Сторону берём из той же величины `wave`, что двигает
          // узел, поэтому подпись всегда уходит к центру экрана, а не за край.
          // Многоточие запрещено — имя переносится и показывается целиком.
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              top: nodeH / 2 - 16,
              left: wave >= 0 ? undefined : nodeW + 14,
              right: wave >= 0 ? nodeW + 14 : undefined,
              maxWidth: 150,
            }}
          >
            <Text
              style={{
                color: current
                  ? accentTextSafeOf(theme)
                  : completed
                    ? theme.textPrimary
                    : theme.textMuted,
                fontSize: current ? 13 : 12,
                lineHeight: current ? 16 : 15,
                fontWeight: current ? "800" : "700",
                textAlign: wave >= 0 ? "right" : "left",
              }}
            >
              {sessionTitle}
            </Text>
          </View>
        ) : null}
        {checkpoint ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: wave >= 0 ? 14 : undefined,
              right: wave < 0 ? 14 : undefined,
              maxWidth: 132,
            }}
          >
            <Text
              style={{
                color: theme.accentText,
                fontSize: fonts.label,
                fontWeight: "900",
                textAlign: wave >= 0 ? "left" : "right",
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                color: theme.textMuted,
                fontSize: Math.max(10, fonts.label - 1),
                fontWeight: "600",
                marginTop: 2,
                textAlign: wave >= 0 ? "left" : "right",
              }}
            >
              {row.role === "final_exam"
                ? triLang(lang, {
                    ru: "Весь материал урока",
                    en: "All the material in the lesson",
                    uk: "Увесь матеріал уроку",
                    es: "Todo el material de la lección",
                    "pt-BR": "Todo o conteúdo da lição",
                    vi: "Toàn bộ bài học",
                    id: "Seluruh materi pelajaran",
                    tr: "Dersin tüm içeriği",
                    pl: "Cały materiał lekcji",
                  })
                : `${triLang(lang, {
                    ru: "Глава",
                    en: "Chapter",
                    uk: "Розділ",
                    es: "Capítulo",
                    "pt-BR": "Capítulo",
                    vi: "Chương",
                    id: "Bab",
                    tr: "Bölüm",
                    pl: "Rozdział",
                  })} ${row.chapterOrdinal}`}
            </Text>
          </View>
        ) : null}
      </LearningV2InlineNodeReveal>
    </View>
  );
});

// ── Глава-аккордеон ──────────────────────────────────────────────────────────
const AnimatedChapterCircle = Reanimated.createAnimatedComponent(Circle);

/**
 * Кольцо прогресса главы. viewBox с запасом под stroke+linecap (r=19, stroke=5,
 * холст 48 — дуга и её круглые концы НЕ обрезаются по краям). Дуга рисуется
 * конечной анимацией ~1с при появлении, без циклов.
 */
function ChapterProgressRing({
  pct,
  locked,
  accent,
  trackColor,
  textColor,
  lockColor,
  delayMs = 0,
}: {
  pct: number;
  locked: boolean;
  accent: string;
  trackColor: string;
  textColor: string;
  lockColor: string;
  delayMs?: number;
}) {
  const size = 48;
  const strokeWidth = 5;
  const radius = 19;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  // зачем: кольцо стартовало с 0 и доезжало до факта за 250+delay+1000мс — прогресс
  // главы «наливался» на глазах при каждом открытии вкладки. Владелец просил статичное
  // открытие, поэтому дуга сразу отрисована на финальном значении, без анимации.
  const fill = useSharedValue(clamped);
  useEffect(() => {
    fill.value = clamped;
    return () => cancelAnimation(fill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Defs>
          <SvgLinearGradient
            id={`chapterRingGrad-${delayMs}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <Stop offset="0" stopColor={accent} stopOpacity={0.72} />
            <Stop offset="1" stopColor={accent} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {!locked ? (
          <AnimatedChapterCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#chapterRingGrad-${delayMs})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {locked ? (
          <Ionicons name="lock-closed" size={13} color={lockColor} />
        ) : (
          <Text
            style={{
              color: textColor,
              fontSize: 13,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {Math.round(clamped * 100)}%
          </Text>
        )}
      </View>
    </View>
  );
}

/** Единое славянское правило множественного числа (ru/uk/pl): 1 — one, 2-4 — few, остальные — many. */
function pluralSlavic(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (last === 1 && abs !== 11) return one;
  if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return few;
  return many;
}

function chapterLessonsWord(count: number, lang: Lang): string {
  switch (lang) {
    case "uk":
      return pluralSlavic(count, "урок", "уроки", "уроків"); // i18n-ok: формы слова «урок» по языку, все 9 языков в switch этой функции
    case "en":
      return count === 1 ? "lesson" : "lessons";
    case "es":
      return count === 1 ? "lección" : "lecciones";
    case "pt-BR":
      return count === 1 ? "lição" : "lições";
    case "vi":
      return "bài học";
    case "id":
      return "pelajaran";
    case "tr":
      return "ders";
    case "pl":
      return pluralSlavic(count, "lekcja", "lekcje", "lekcji");
    default:
      return pluralSlavic(count, "урок", "урока", "уроков"); // i18n-ok: формы слова «урок» по языку, все 9 языков в switch этой функции
  }
}

/**
 * «8 уроков · пройдено 3»; при нулевом прогрессе — просто «8 уроков».
 * зачем: прежний вариант «идёт урок 1» дублировал кольцо процентов и вводил в
 * заблуждение — урок с нулевым прогрессом ещё не начат. Число пройденных уроков
 * — честная и полезная величина, которой в кольце нет.
 */
function chapterStatusLine(
  from: number,
  to: number,
  doneCount: number,
  lang: Lang,
): string {
  const count = to - from + 1;
  const countPart = `${count} ${chapterLessonsWord(count, lang)}`;
  if (doneCount <= 0) return countPart;
  const done = triLang(lang, {
    ru: `пройдено ${doneCount}`,
    en: `${doneCount} done`,
    uk: `пройдено ${doneCount}`,
    es: `${doneCount} completadas`,
    "pt-BR": `${doneCount} concluídas`,
    vi: `đã xong ${doneCount}`,
    id: `${doneCount} selesai`,
    tr: `${doneCount} tamamlandı`,
    pl: `ukończono ${doneCount}`,
  });
  return `${countPart} · ${done}`;
}

/**
 * Заголовок главы-аккордеона: кольцо, название, статус, Plus-чип и шеврон.
 * Раскрываемое тело намеренно не имеет общего контейнера: карточки уроков
 * остаются на полной ширине списка, как и до группировки по главам.
 * Раскрытие — конечная Reanimated-анимация высоты по замеренному контенту.
 */
const ChapterCard = React.memo(function ChapterCard({
  title,
  statusLine,
  pct,
  lockedPlus,
  expanded,
  onToggle,
  accent,
  isGoldTheme,
  t,
  f,
  themeMode,
  delayMs = 0,
  children,
}: {
  title: string;
  statusLine: string;
  pct: number;
  lockedPlus: boolean;
  expanded: boolean;
  onToggle: () => void;
  accent: string;
  isGoldTheme: boolean;
  t: ReturnType<typeof useTheme>["theme"];
  f: ReturnType<typeof useTheme>["f"];
  themeMode: ThemeMode;
  delayMs?: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);
  const [contentH, setContentH] = useState(0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, progress]);
  const bodyStyle = useAnimatedStyle(() => ({
    height:
      contentH === 0 ? (expanded ? undefined : 0) : progress.value * contentH,
    opacity: progress.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));
  // зачем: раньше каждая глава влетала FadeInDown.delay(60 + index*50) — список глав
  // «наползал» снизу при каждом открытии вкладки. Владелец просил статичное открытие,
  // поэтому анимация входа снята: карточка сразу на финальном месте.
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${statusLine}`}
        onPress={() => {
          hapticTap();
          onToggle();
        }}
        activeOpacity={0.82}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginHorizontal: 14,
          paddingVertical: 13,
          paddingHorizontal: 14,
        }}
      >
        <ChapterProgressRing
          pct={pct}
          locked={lockedPlus}
          accent={accent}
          trackColor={t.bgSurface}
          textColor={t.textPrimary}
          lockColor={t.textMuted}
          delayMs={delayMs}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: t.textPrimary,
              fontSize: f.body,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: t.textMuted,
              fontSize: f.label - 1,
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            {statusLine}
          </Text>
        </View>
        {lockedPlus ? <PlusBadge themeMode={themeMode} size="xs" /> : null}
        <Reanimated.View
          style={[
            {
              width: 26,
              height: 26,
              borderRadius: 9,
              backgroundColor: expanded ? `${accent}24` : t.bgSurface,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            },
            chevronStyle,
          ]}
        >
          <Ionicons
            name="chevron-down"
            size={13}
            color={expanded ? accent : t.textMuted}
          />
        </Reanimated.View>
      </TouchableOpacity>
      <Reanimated.View style={[{ overflow: "hidden" }, bodyStyle]}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - contentH) > 1) setContentH(h);
          }}
          style={{ paddingBottom: 10 }}
        >
          {children}
        </View>
      </Reanimated.View>
    </View>
  );
});

type LegacyCoinBalanceBinding = Readonly<{
  ownerStableId: string;
  accountGeneration: number;
  balance: number;
}>;

type LegacyAccountToken = ReturnType<typeof captureAccountGeneration>;

function activeLegacyAccountOwner(token: LegacyAccountToken): string | null {
  if (token.phase !== "active") return null;
  return token.stableId?.trim() || null;
}

/**
 * Read-only V1 header projection. It starts neutral and becomes visible only
 * after a durable wallet read for the exact active owner/generation. Snapshot
 * updates may refresh that already-validated binding, never establish it.
 */
// зачем (координатор 15.10, «Обучение» — «—» ~1,3 с при каждом открытии): последнее ПРОВЕРЕННОЕ (durable) значение того же владельца и
// поколения аккаунта живёт в памяти процесса — повторный вход рисует его сразу, durable-чтение лишь подтверждает. Снимок по-прежнему
// не устанавливает привязку (защита от чужого баланса при смене аккаунта): сюда пишет только durable-ответ.
let lastDurableLegacyCoinBinding: LegacyCoinBalanceBinding | null = null;

function cachedLegacyCoinBinding(token: LegacyAccountToken): LegacyCoinBalanceBinding | null {
  const owner = activeLegacyAccountOwner(token);
  const cached = lastDurableLegacyCoinBinding;
  return owner && cached && cached.ownerStableId === owner && cached.accountGeneration === token.generation ? cached : null;
}

function useLegacyCoinBalanceBinding(enabled: boolean): LegacyCoinBalanceBinding | null {
  const initialTokenRef = useRef<LegacyAccountToken>(captureAccountGeneration());
  const [token, setToken] = useState<LegacyAccountToken>(initialTokenRef.current);
  const [binding, setBinding] = useState<LegacyCoinBalanceBinding | null>(() => cachedLegacyCoinBinding(initialTokenRef.current));

  useEffect(() => {
    const subscription = subscribeAccountGeneration((nextToken) => {
      lastDurableLegacyCoinBinding = null; // другой владелец/поколение — кэш прошлого аккаунта больше не показываем
      setBinding(null);
      setToken(nextToken);
    });
    // зачем (Ревизор 15.10, 🟡 к ef72bc20a): начальный token взят в рендере, а подписка не отдаёт текущее значение — если аккаунт
    // сменился между рендером и этим эффектом, на плашке осталось бы число прошлого владельца. Сверяем сразу после подписки.
    const fresh = captureAccountGeneration();
    if (fresh.generation !== initialTokenRef.current.generation || fresh.stableId !== initialTokenRef.current.stableId) {
      console.warn('[LESSONS-COINS] поколение сменилось между рендером и подпиской — сброс плашки', JSON.stringify({ from: initialTokenRef.current.generation, to: fresh.generation })); // guard-ok: ветвление называет причину
      setBinding(null);
      setToken(fresh);
    }
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const ownerStableId = activeLegacyAccountOwner(token);
    if (!ownerStableId) {
      setBinding(null);
      return undefined;
    }
    // зачем (Макеты 13.10, learn-014): вкладка в фоне (поверх окно Plus, урок) раньше обнуляла баланс — под шторкой в шапке
    // стояло «—», а при возврате число мигало «— → N». Держим последнее проверенное значение ЭТОГО владельца и поколения;
    // сброс — только при смене аккаунта (подписка выше) или без владельца.
    if (!enabled) return undefined;

    let alive = true;
    let durableReadValidated = false;
    setBinding((prev) => (prev && prev.ownerStableId === ownerStableId && prev.accountGeneration === token.generation ? prev : cachedLegacyCoinBinding(token)));

    void getRunesBalanceRead().then((read) => {
      if (!alive) return;
      if (read.quality !== "durable") {
        console.warn('[LESSONS-COINS] баланс: чтение не durable — держим прежнее значение', { quality: read.quality });
        return;
      }
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        console.warn('[LESSONS-COINS] баланс: поколение аккаунта сменилось во время чтения — ответ отброшен', { generation: token.generation });
        return;
      }
      durableReadValidated = true;
      console.log('[COIN-PILL]', JSON.stringify({ screen: 'lessons', source: 'wallet_cache', value: read.wallet.balance, quality: read.quality, hasAccount: ownerStableId.length > 0, generation: token.generation })); // guard-ok: временная трассировка (координатор 15.10)
      const durable = Object.freeze({
        ownerStableId,
        accountGeneration: token.generation,
        balance: read.wallet.balance,
      });
      lastDurableLegacyCoinBinding = durable;
      setBinding(durable);
    }).catch(noteSwallowedHandler('lessons:useEffect.getRunesBalanceRead'));

    const unsubscribeSnapshot = subscribeAppSnapshot(() => {
      if (!alive
        || !durableReadValidated
        || !isCurrentAccountGeneration(token, ownerStableId)) return;
      const refreshed = Object.freeze({
        ownerStableId,
        accountGeneration: token.generation,
        balance: peekRunes(),
      });
      lastDurableLegacyCoinBinding = refreshed; // уже проверенная привязка того же владельца — повторный вход покажет свежее число
      setBinding(refreshed);
    });

    return () => {
      alive = false;
      unsubscribeSnapshot();
    };
  }, [enabled, token]);

  return binding;
}

export default function LessonsTab({
  overlayIdentityEpoch: _overlayIdentityEpoch = 0,
  presentation = "push",
  // зачем: дефолт — единственная реальная точка входа (пропс никто не передаёт),
  // поэтому смена "v2" → "lessons" и есть требование владельца «при входе с
  // Главной открываются СТАРЫЕ уроки». БЕЗУСЛОВНО, в том числе в дев-сборке:
  // первая попытка привязала дефолт к ENABLE_DEV_TOOLS, и у владельца (дев)
  // по-прежнему открывался курс. Дев-доступ к курсу живёт отдельно — вкладкой
  // «V2» в шапке, а не подменой точки входа.
  initialPage = "lessons",
}: LessonsTabProps = {}) {
  void _overlayIdentityEpoch;
  const perfBodyStart = perfR1BodyStart('lessons'); // зачем (R1): где в теле экрана уходит время — контрольные точки [PERF-R1-BODY], только dev
  // зачем (владелец 22.09, «ни один урок открыть нельзя»): этот экран
  // рендерится ДВУМЯ разными маршрутами (/lessons_list и /learning-v2/course
  // — оба ре-экспортируют LessonsTab). Если он размонтируется и монтируется
  // заново сразу после открытия сессии, initialPage сбрасывается на "lessons"
  // и внутреннее состояние карты V2 теряется. Лог остаётся навсегда.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 8));
  useMemHomeRegisterSources('lessons_instance'); // зачем ([MEM-HOME] 18.10, R129): живые экземпляры «Обучения»; dev, в релизе пусто
  // R08: время последнего касания экрана «Обучения» — прогрев занятия ждёт, пока человек 2,5 с ничего не трогает
  const lastLessonsTouchAtRef = useRef(Date.now());
  useEffect(() => {
    if (!__DEV__) return;
    console.log(
      "[V2-PAGE] LessonsTab:mount",
      JSON.stringify({ instanceId: instanceIdRef.current, presentation, initialPage }),
    );
    return () => {
      console.log(
        "[V2-PAGE] LessonsTab:unmount",
        JSON.stringify({ instanceId: instanceIdRef.current, presentation, initialPage }),
      );
    };
  }, []);
  useEffect(() => {
    // зачем (координатор 13.10, B1: «Уроки» собираются под онбордингом ≈9 с входа): журнал — смонтирована ли вкладка при открытом онбординге; после правки ждём onboardingActive=false
    console.log("[LESSONS-REBUILD] lessons_tab_mounted", JSON.stringify({ instanceId: instanceIdRef.current, presentation, onboardingActive: isOnboardingDeferActive(), atMs: Date.now() }));
    return () => {
      console.log("[LESSONS-REBUILD] lessons_tab_unmounted", JSON.stringify({ instanceId: instanceIdRef.current, onboardingActive: isOnboardingDeferActive() }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  usePerfR1Probe("lessons"); // зачем (координатор 12.10, R1_PERF_FIRST_FRAME): первый кадр и число коммитов корня за 3 с; в релизе — пустая функция
  const isRetainedTab = presentation === "tab";
  perfR1BodyMark('lessons', 'a_tab_pad', perfBodyStart);
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const topFadeScroll = useTopFadeScroll();
  const { goHome, runtimeOwnerId } = useTabNav();
  const focusTick = useTabFocusTick(); // зачем (каскад [TABS-RENDER]): focusTick — свой контекст, см. app/TabContext.tsx
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const learnGlass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (Темы R1_THEMEMODE_LEGACY_MAP, координатор 12.10): карточка урока «Обучения» по замыслу ВСЕГДА тёмная с белым текстом (lessonTextColor),
  // а цвет уровня A1–B2 — светлый акцент на ней (кольцо, процент, заливка прогресса). Поэтому цвета уровней берём из токенов ТЕМНОГО оформления
  // той же темы и того же шага ползунка: тон следует теме, читаемость акцента на тёмной карточке сохраняется и при светлом оформлении приложения.
  // зачем (решение владельца 12.10, п.81 (11)): при СВЕТЛОМ оформлении плашка урока светлая (lessonCardLightSurface) и чернила уровня берутся из токенов светлого оформления; при тёмном — как раньше.
  const lightLessonCards = learnGlass.isLight;
  const levelInkGlass = useMemo(
    () => liquidGlassTokens(liquidGlassThemeId, { level: learnGlass.level, appearance: lightLessonCards ? "light" : "dark", intensity: learnGlass.intensity }),
    [liquidGlassThemeId, learnGlass.level, learnGlass.intensity, lightLessonCards],
  );
  perfR1BodyMark('lessons', 'b_energy', perfBodyStart);
  const { energyReady: legacyEnergyReady } = useEnergy();
  const learningV2ReduceMotionPreference = useReduceMotionPreference();
  const insets = useStableSafeAreaInsets();
  const listBottomPad = isRetainedTab
    ? tabContentBottomPad
    : Math.max(insets.bottom, 12) + 20;
  const headerTopPad = isRetainedTab ? 12 : insets.top + 12;
  const isGoldTheme = themeMode === "gold";
  const isOliveTheme = themeMode === "olive";
  const isSagePorcelainTheme = isLightThemeMode(themeMode);
  const goldBright = GOLD_RICH.champagne;
  const goldAntique = GOLD_RICH.agedGold;
  const goldHairline = GOLD_RICH.hairline;
  const goldSurface = GOLD_RICH.blackPiano;
  const screenTitleColor = t.textPrimary;
  perfR1BodyMark('lessons', 'c_lang', perfBodyStart);
  const { lang, s } = useLang();
  const { studyTarget, refresh: refreshStudyTarget } = useStudyTarget();
  const lessonCacheTarget = storageStudyTarget(studyTarget);
  const lessonCacheTargetRef = useRef(lessonCacheTarget);
  lessonCacheTargetRef.current = lessonCacheTarget;
  perfR1BodyMark('lessons', 'd_boot_read_before', perfBodyStart);
  const boot =
    readLessonsUiSessionCache(lessonCacheTarget) ??
    getLessonsTabInitialState(studyTarget);
  perfR1BodyMark('lessons', 'e_boot_read_after', perfBodyStart);
  const [noLimits, setNoLimits] = useState(() => boot?.noLimits ?? false);
  const [legacyFreeLessonCap, setLegacyFreeLessonCap] = useState(
    () => boot?.legacyFreeLessonCap ?? FREE_LESSON_LIMIT,
  );
  const {
    hasPremiumAccess: isPremium,
    devLocalPlusOverride,
  } = usePremium();
  const {
    devContentUnlock: effectiveDevContentUnlock,
    noLimits: effectiveNoLimits,
    legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
  } = projectDevLessonAccess(
    {
      devContentUnlock: DEV_CONTENT_UNLOCK,
      noLimits,
      legacyFreeLessonCap,
      freeLessonLimit: FREE_LESSON_LIMIT,
    },
    devLocalPlusOverride,
  );
  perfR1BodyMark('lessons', 'f_feature_access', perfBodyStart);
  const dialogAccess = useFeatureAccess("ai_dialog");
  const [scores, setScores] = useState<number[]>(
    () => boot?.scores ?? new Array(32).fill(0),
  );
  const [progCounts, setProgCounts] = useState<number[]>(
    () => boot?.progCounts ?? new Array(32).fill(0),
  );
  const [passCounts, setPassCounts] = useState<number[]>(
    () => boot?.passCounts ?? new Array(32).fill(0),
  );
  const [examBestPcts, setExamBestPcts] = useState<Record<string, number>>(
    () => boot?.examBestPcts ?? {},
  );
  const examBestPctTargetRef = useRef(lessonCacheTarget);
  const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>(
    () => boot?.examPassCounts ?? {},
  );
  // persistedUnlocked — это список уроков, ранее открытых через unlockLesson()
  // (после прохождения предыдущего на ★2+ (D71, BRONZE_UNLOCK_SCORE), покупки премиума, сдачи зачёта).
  // Используется как safety-net, чтобы юзер после restore из облака или просто
  // апдейта не терял уже открытые уроки, если у него best_score < 2.5
  // (медаль не сохранена) и lesson{N}_progress пропал (он не в SYNC_KEYS).
  const [persistedUnlocked, setPersistedUnlocked] = useState<number[]>(
    () => boot?.persistedUnlocked ?? [],
  );
  // зачем (владелец 2026-09-17): уроки, открытые за 100 жемчужин. Живут в
  // состоянии экрана, чтобы после покупки карточка ожила МГНОВЕННО, не дожидаясь
  // перечитывания снапшота (optimistic UI).
  const [purchasedLessons, setPurchasedLessons] = useState<number[]>(
    () => boot?.purchasedLessons ?? [],
  );
  const [examResults, setExamResults] = useState<
    Record<
      string,
      {
        pct: number;
        passed: boolean;
      }
    >
  >(() => boot?.examResults ?? {});
  const scrollRef = useRef<any>(null);
  const learningV2CoinTargetRefHolder = useRef<View>(null);
  const {
    GestureWrap: BouncyWrap,
    stretch: bouncyStretch,
    onBouncyScroll,
  } = useBouncy();
  perfR1BodyMark('lessons', 'g_bouncy', perfBodyStart);
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const lessonsTabVisible = isRetainedTab && runtimeOwnerId === "lessons";
  const lessonsRuntimeActive = useRuntimeActive(
    isRetainedTab ? lessonsTabVisible : true,
  );
  // Learning V2 повторно использует этот же список и тот же LessonCard.
  // Карта раскрывается прямо под выбранной плашкой; одновременно открыта одна.
  const dialogsEnabled = isAiDialogEnabled();
  // зачем (R92): курс V2 — только при языке интерфейса с пояснениями курса (ru/uk); [V2-LOCALE-GATE] пишет решение при смене языка.
  const learningV2CanOpen = LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY && isLearningV2OpenForUiLangV1(lang, "lessons_tab");
  const [pageRaw, setPageRaw] = useState<"lessons" | "dialogs" | "v2">(() => startLessonsPage(initialPage, presentation, learningV2CanOpen));
  // зачем (владелец 22.09, «открываю урок — секунда — назад в раздел уроки»):
  // лог владения экраном лестницы. Карта V2 гаснет и открывается заново через
  // ~3с после открытия сессии (metro-console показал map:unmount сразу после
  // повторного router.push на ту же сессию) — нужно увидеть, ЧТО меняет page
  // обратно и МОНТИРУЕТСЯ ли LessonsTab целиком заново. Печатаем стек вызова,
  // чтобы отличить пользовательский тап от программного сброса.
  const page = pageRaw;
  const setPage = useCallback((next: "lessons" | "dialogs" | "v2") => {
    if (__DEV__) {
      console.log(
        "[V2-PAGE] setPage",
        JSON.stringify({ from: pageRaw, to: next, presentation, initialPage, instanceId: instanceIdRef.current, runtimeOwnerId, visible: lessonsTabVisible }),
        new Error("trace").stack?.split("\n").slice(1, 5).join(" | "),
      );
    }
    setPageRaw(next);
  }, [pageRaw, presentation, initialPage, runtimeOwnerId, lessonsTabVisible]);
  useEffect(() => {
    if (page !== "v2" || learningV2CanOpen) return;
    console.log(`[V2-LOCALE-GATE] lessons_tab: карта V2 открыта, а язык интерфейса ${lang} без пояснений курса → классический курс`); // guard-ok: итог смены языка
    setPageRaw("lessons");
  }, [page, learningV2CanOpen, lang]);
  // зачем (координатор 15.10, Сверка Б11: тап «Новые уроки» прошёл в логике, а на экране остался список A1): какой
  // ЭКЗЕМПЛЯР вкладки что реально нарисовал после смены страницы — в одном запуске живут до трёх экземпляров (inst 1–3),
  // и нужно увидеть, тот ли экземпляр получил тап, что виден на экране.
  // R08: navFocused — фокус экрана вкладок в корневом стеке (freezeOnBlur замораживает нативный кадр расфокусированного экрана)
  const navFocused = useIsFocused();
  useEffect(() => {
    console.log("[V2-MAP] page:commit", JSON.stringify({ instanceId: instanceIdRef.current, page, branch: page === "v2" ? "v2_map" : page === "dialogs" ? "dialogs" : "legacy_list", presentation, runtimeOwnerId, visible: lessonsTabVisible, navFocused, atMs: Date.now() }));
  }, [page, presentation, runtimeOwnerId, lessonsTabVisible, navFocused]);
  // зачем (владелец 18.10: «когда таб Уроки открывается, таббар не должен пропадать!»): прежде (решение 20.09) карта
  // Learning V2 прятала таббар, пока открыта, — а с c4a3fb870 карта открывается сразу при входе на вкладку, и таббар
  // пропадал на каждом открытии «Уроков». Корень вкладки таббар больше не прячет; нижний отступ списка уже равен
  // верху плавающей капсулы + зазор (listBottomPad ← useTabContentBottomPad). Прохождение урока — отдельный маршрут вне вкладок.
  useEffect(() => {
    if (!lessonsTabVisible) return;
    console.log('[TABBAR-LESSONS]', JSON.stringify({ page, retainedTab: isRetainedTab, owner: runtimeOwnerId, tabBar: 'visible', reason: 'lessons_root_never_hides', bottomPad: listBottomPad })); // guard-ok: решение о таббаре на открытии вкладки
  }, [page, lessonsTabVisible, isRetainedTab, runtimeOwnerId, listBottomPad]);
  perfR1BodyMark('lessons', 'h_coin_bindings', perfBodyStart);
  const legacyCoinRankBinding = useMyCoinRankBinding();
  const legacyCoinBalanceBinding = useLegacyCoinBalanceBinding(
    lessonsRuntimeActive && page === "lessons",
  );
  const legacyCoinProjectionTrusted = Boolean(
    legacyCoinRankBinding
    && legacyCoinBalanceBinding
    && legacyCoinRankBinding.ownerStableId === legacyCoinBalanceBinding.ownerStableId
    && legacyCoinRankBinding.accountGeneration === legacyCoinBalanceBinding.accountGeneration,
  );
  const legacyCoinRank = legacyCoinProjectionTrusted ? legacyCoinRankBinding?.rank ?? null : null;
  const legacyCoinBalance = legacyCoinProjectionTrusted ? legacyCoinBalanceBinding?.balance ?? null : null;
  // зачем (координатор 15.10, «Обучение» 0 при Главной 53): что показывает плашка и почему — привязка баланса, ранга и их совпадение
  useEffect(() => {
    console.log('[COIN-PILL]', JSON.stringify({
      screen: 'lessons',
      source: legacyCoinBalanceBinding ? 'wallet_cache' : 'none',
      shown: legacyCoinBalance ?? '—',
      value: legacyCoinBalanceBinding?.balance ?? null,
      snapshotValue: peekRunes(),
      trusted: legacyCoinProjectionTrusted,
      hydrated: legacyCoinBalanceBinding !== null,
      // зачем (координатор 15.10): без идентификатора аккаунта в журнале — только поколение и совпадение владельца баланса и ранга
      rankGeneration: legacyCoinRankBinding?.accountGeneration ?? null,
      rankSameOwner: legacyCoinRankBinding && legacyCoinBalanceBinding ? legacyCoinRankBinding.ownerStableId === legacyCoinBalanceBinding.ownerStableId : null,
      balanceGeneration: legacyCoinBalanceBinding?.accountGeneration ?? null,
    })); // guard-ok: временная трассировка
  }, [legacyCoinBalance, legacyCoinBalanceBinding, legacyCoinProjectionTrusted, legacyCoinRankBinding]);
  // зачем (Ревизор 3.120): монета 20 dp в шапке — копия 96² вместо исходника 768².
  const legacyCoinRankSource = isValidCoinRank(legacyCoinRank)
    ? coinRankDisplaySource(legacyCoinRank, 20)
    : null;
  // зачем (владелец 17.10: «этот модал удаляй полностью, он не нужен!!!»): окно «Пропуск основателя» удалено целиком —
  // гейт, квитанция «видел», ник пропуска. Карта и прогрев занятия от него больше не зависят. Ключи квитанции в AsyncStorage не трогаем.
  perfR1BodyMark('lessons', 'i_v2_callbacks', perfBodyStart);
  // зачем (аудит 2026-09-21): поиск по урокам открывается ЛУПОЙ в ряду чипов,
  // а не живёт постоянной строкой — владелец: «не фулл строка ввода, а просто
  // кнопочка». Поле раскрывается НАД рядом, поэтому ряд чипов не сдвигается.
  const [legacyLessonQuery, setLegacyLessonQuery] = useState("");
  const [learningV2DevUnlockAllRequested, setLearningV2DevUnlockAllRequested] =
    useState(peekLearningV2DevUnlockAll); // зачем (эмулятор 17.10): вторая копия вкладки (диплинк) не сбрасывает dev-разблокировку
  const learningV2DevUnlockAllActive =
    __DEV__ && ENABLE_DEV_TOOLS && learningV2DevUnlockAllRequested;
  const [expandedLearningV2Lesson, setExpandedLearningV2Lesson] = useState<
    number | null
  >(null);
  const [learningV2DictionaryOpen, setLearningV2DictionaryOpen] =
    useState(false);
  // зачем (владелец 2026-09-21): словарь показывает слова ВСЕГО курса, а не
  // одного урока. Прежний скоуп висел на `expandedLearningV2Lesson`, который
  // после перехода 20.09 на сплошную карту при обычном входе НЕ заполняется
  // вовсе — и словарь молча умирал вместе с кнопкой (класс бага «механизм
  // есть, а данных не дали»). Уроков 32, все ключи локальные: ни одного
  // чтения Firestore здесь нет и не появляется.
  perfR1BodyMark('lessons', 'j_v2_scope', perfBodyStart);
  const learningV2DictionaryScope = useMemo(
    () =>
      page === "v2"
        ? {
            targetLanguage: studyTarget,
            lessonOrdinals: LEARNING_V2_COURSE_LESSON_ORDINALS,
          }
        : null,
    [page, studyTarget],
  );
  const { words: learningV2DictionaryWords } =
    useLearningV2CourseUnlockedWordsV1(learningV2DictionaryScope, {
      includeAuthoringPreview: __DEV__,
    });
  const [selectedLearningV2Session, setSelectedLearningV2Session] = useState<{
    lessonOrdinal: number;
    sessionOrdinal: number;
    state: LearningV2AccordionSessionStateV1;
    traceId: string;
  } | null>(null);
  // зачем (learning-v2-013, learning-v2.html 2.4 modal-locked): тап по закрытому занятию открывает своё окно — отдельно от
  // окна запуска (selectedLearningV2Session), чтобы не задеть прогрев и трассировку запуска. Только локальное состояние.
  const [learningV2LockedSession, setLearningV2LockedSession] = useState<{
    lessonOrdinal: number;
    sessionOrdinal: number;
  } | null>(null);
  // Только для лога подсказки отказа ([V2-LAUNCH] hint:show): было ли окно занятия ещё открыто в момент показа.
  const selectedLearningV2SessionOpenRef = useRef(false);
  selectedLearningV2SessionOpenRef.current = selectedLearningV2Session !== null;
  const learningV2CatalogLocator = useMemo(
    () => ({
      environment: "production" as const,
      targetLanguage: studyTarget,
      studyTarget,
      learnerSourceLocale: lang,
      interfaceLocale: lang,
      seasonId: "learning-v2",
    }),
    [lang, studyTarget],
  );
  // Каталог EN материализуется синхронно (32 × 56 занятий + хеши). Никогда
  // не трогаем его в render: на первом входе /learning-v2/course JS иначе не
  // принимал касания. До true-idle прогрева безопасны fallback-названия.
  const [learningV2Catalog, setLearningV2Catalog] =
    useState<LearningV2ActiveCourseCatalogV1 | null>(null);
  const [learningV2Progress, setLearningV2Progress] = useState<{
    completedSessionIds: readonly string[];
    currentSessionId: string | null;
  }>({ completedSessionIds: [], currentSessionId: "lesson-01:session:01" });
  const [learningV2ProgressHydrated, setLearningV2ProgressHydrated] =
    useState(false);
  // зачем: V2 — не отдельный экран, а страница ЭТОЙ же вкладки, и раньше обе
  // загрузки (прогресс + каталог) гейтились `page !== "v2"`. То есть чтение диска
  // стартовало ТОЛЬКО после тапа по «V2» — человек всегда ждал первый заход.
  // Теперь данные прогреваются, пока он ещё смотрит на список уроков: к моменту
  // тапа состояние уже в памяти и страница открывается первым же кадром.
  // Стоимость нулевая для Firebase (локальный AsyncStorage + кэш каталога) и
  // разовая по диску — оба загрузчика дедуплицируются собственными кэшами.
  // зачем (аудит «каждый раздел открывается мгновенно», 04.10): комментарий выше обещал прогрев «пока человек смотрит на список», но условие осталось
  // только page === "v2" — первый заход в V2 в продакшене ждал диск. Прогрев взводим ПОСЛЕ первого кадра вкладки «Обучение»: фокус на вкладке
  // → runAfterInteractions → ещё 2 с паузы (не тормозим холодный старт), только пока открыт список уроков. Стоимость — локальный диск, без сети.
  perfR1BodyMark('lessons', 'k_v2_warmup', perfBodyStart);
  const [learningV2WarmupArmed, setLearningV2WarmupArmed] = useState(false);
  useFocusEffect(
    useCallback(() => {
      // зачем (план Б): при скрытом V2 прогрев каталога V2 не нужен — ни диска, ни памяти.
      if (!learningV2CanOpen || learningV2WarmupArmed || page === "dialogs") return undefined;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const waitForIdle = () => {
        const idleMs = Date.now() - lastLessonsTouchAtRef.current;
        if (idleMs < 2500) {
          timer = setTimeout(waitForIdle, 2500 - idleMs + 50);
          return;
        }
        setLearningV2WarmupArmed(true);
      };
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(waitForIdle, 2500);
      });
      return () => {
        task.cancel?.();
        if (timer) clearTimeout(timer);
      };
    }, [learningV2CanOpen, learningV2WarmupArmed, page]),
  );
  // Переход на страницу V2 сам по себе не является разрешением занимать
  // JS-поток: и прямой вход /learning-v2/course ждёт true-idle.
  const learningV2WarmupEnabled = learningV2WarmupArmed;
  // Прогресс — не декоративный прогрев, а источник истины для current/locked
  // и repeat. Читаем его сразу при входе в V2; откладываем только тяжёлый
  // каталог, материализация которого и блокировала касания.
  const learningV2ProgressWarmupEnabled = page === "v2" || learningV2WarmupArmed;
  useFocusEffect(
    useCallback(() => {
      if (!learningV2ProgressWarmupEnabled) return undefined;
      let cancelled = false;
      // зачем: здесь стоял безусловный setLearningV2ProgressHydrated(false).
      // На каждый возврат фокуса он откатывал раздел в «ещё не готов», и
      // зависящие от флага эффекты прогрева перезапускались — лишняя работа
      // ровно в момент открытия. Флаг переводится в true один раз, когда
      // прогресс прочитан, и назад уже не откатывается.
      const warmupStartedAt = Date.now();
      void withAccountTransitionLock(async () => {
        const stableId = await getStableId();
        const accountScopeHash =
          deriveLocalOfflineProgressAccountScopeHash(stableId);
        const diskStartedAt = Date.now();
        const state = await createLearningV2CourseLocalProgressStoreV1(
          AsyncStorage,
        ).load(accountScopeHash);
        if (__DEV__) {
          console.log(
            "[V2-OPEN] progress:disk",
            JSON.stringify({
              diskMs: Date.now() - diskStartedAt,
              completed: state.completedSessionIds.length,
              current: state.currentSessionId,
            }),
          );
        }
        // зачем: звёзды 0–3 на пройденных узлах читаются в том же прогреве, что
        // и прогресс — один заход на диск вместо двух, ноль запросов к серверу.
        await hydrateLearningV2SessionStarResults(accountScopeHash);
        return {
          completedSessionIds: state.completedSessionIds,
          currentSessionId: state.currentSessionId,
        };
      })
        .then((value) => {
          if (cancelled) return;
          // зачем: сюда каждый фокус приходил НОВЫЙ объект с тем же прогрессом.
          // preparedProgress пересчитывался, карта перерисовывалась целиком —
          // владелец видел это как моргание при возврате в раздел. Меняем
          // состояние только когда прогресс реально другой.
          setLearningV2Progress((previous) => {
            const sameCurrent =
              previous.currentSessionId === value.currentSessionId;
            const sameCompleted =
              previous.completedSessionIds.length ===
                value.completedSessionIds.length &&
              previous.completedSessionIds.every(
                (id, index) => id === value.completedSessionIds[index],
              );
            return sameCurrent && sameCompleted
              ? previous
              : {
                  completedSessionIds: value.completedSessionIds,
                  currentSessionId: value.currentSessionId,
                };
          });
          if (__DEV__) {
            const t0 = (globalThis as { __v2OpenT0?: number }).__v2OpenT0;
            console.log(
              "[V2-OPEN] progress:applied",
              JSON.stringify({
                sinceTap: t0 ? Date.now() - t0 : null,
                warmupMs: Date.now() - warmupStartedAt,
                completed: value.completedSessionIds.length,
                current: value.currentSessionId,
              }),
            );
          }
          setLearningV2ProgressHydrated(true);
        })
        .catch((error) => {
          // Немой catch запрещён: раздел открывается без прогресса, и без
          // причины в логе это выглядит как «карта пустая без объяснений».
          DebugLogger.error(
            "learning_v2:progress_hydrate",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
          if (!cancelled) setLearningV2ProgressHydrated(true);
        });
      return () => {
        cancelled = true;
      };
    }, [learningV2ProgressWarmupEnabled]),
  );
  useFocusEffect(
    useCallback(() => {
      if (!learningV2WarmupEnabled) return undefined;
      let cancelled = false;
      const stableId = peekStableId();
      const cached = stableId
        ? peekLearningV2ActiveCourseCatalogV1(
            learningV2CatalogLocator,
            deriveLocalOfflineProgressAccountScopeHash(stableId),
          )
        : null;
      setLearningV2Catalog((current) =>
        current?.interfaceLocale === learningV2CatalogLocator.interfaceLocale &&
        current.studyTarget === learningV2CatalogLocator.studyTarget &&
        current.targetLanguage === learningV2CatalogLocator.targetLanguage
          ? current
          : cached,
      );
      void loadLearningV2ActiveCourseCatalogV1(learningV2CatalogLocator)
        .then((result) => {
          if (!cancelled) setLearningV2Catalog(result.catalog);
        })
        // Немой catch запрещён: отказ каталога оставляет экран на кэше, и без
        // записи в журнал это выглядит как «просто старые данные».
        .catch((error) => {
          if (cancelled) return;
          DebugLogger.warn(
            '[V2-CATALOG]',
            `active catalog load failed: ${String(error)}`,
          );
        });
      return () => {
        cancelled = true;
      };
    }, [learningV2CatalogLocator, learningV2WarmupEnabled]),
  );
  // зачем: владелец 20.09 — «никаких морганий». Здесь строка собиралась как
  // `${captureAccountGeneration().generation}:...`, но generation читался ВНЕ
  // зависимостей useMemo. Значение менялось молча, и при любом следующем
  // пересчёте мемо ключ внезапно становился другим. Внутри карты смена
  // scopeKey сбрасывает выбранный уровень (setSelectedLevel) и пересобирает
  // проекцию — карта прыгала на другую секцию прямо на глазах.
  // Генерацию фиксируем и меняем ТОЛЬКО когда аккаунт действительно другой.
  perfR1BodyMark('lessons', 'l_v2_generation', perfBodyStart);
  const learningV2AccountGenerationRef = useRef(
    captureAccountGeneration().generation,
  );
  const [learningV2AccountGeneration, setLearningV2AccountGeneration] =
    useState(learningV2AccountGenerationRef.current);
  useEffect(() => {
    const generation = captureAccountGeneration().generation;
    if (generation === learningV2AccountGenerationRef.current) return;
    learningV2AccountGenerationRef.current = generation;
    setLearningV2AccountGeneration(generation);
  }, [focusTick]);
  // зачем (поручение владельца через координатора 18.10): запомненный урок карты (память → диск); undefined — ещё не читали, карта рисуется по первому незавершённому занятию
  const learningV2LastLesson = useLearningV2LastLesson(studyTarget);
  const learningV2ProjectionScopeKey = useMemo(
    () =>
      `${learningV2AccountGeneration}:${studyTarget}:${_overlayIdentityEpoch}`,
    [_overlayIdentityEpoch, learningV2AccountGeneration, studyTarget],
  );
  perfR1BodyMark('lessons', 'before_v2_progress', perfBodyStart);
  const learningV2PreparedProgress = useMemo(
    () =>
      prepareLearningV2CourseAccordionProgressV1({
        completedSessionIds: learningV2Progress.completedSessionIds,
        currentSessionId: learningV2Progress.currentSessionId,
      }),
    [
      learningV2Progress.completedSessionIds,
      learningV2Progress.currentSessionId,
    ],
  );
  // зачем: карту V2 строит LearningV2PulseCourse из той же модели. Здесь она
  // считалась ВТОРОЙ раз и после перехода на сплошную карту давала 2048 строк
  // на каждое изменение прогресса — на экран они не попадали, но блокировали
  // вход в раздел и нажатия (владелец 20.09: «что-то блокирует вход, раздел
  // должен открываться мгновенно»). Проекция кэшируется внутри модели, так
  // что PulseCourse ничего не теряет.
  const prepareLearningV2Lesson = useCallback(
    (lessonOrdinal: number) => {
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: learningV2ProjectionScopeKey,
        expandedLessonOrdinal: lessonOrdinal,
        preparedProgress: learningV2PreparedProgress,
      });
    },
    [learningV2PreparedProgress, learningV2ProjectionScopeKey],
  );
  useEffect(() => {
    if (page !== "v2") return undefined;
    const currentLessonMatch = /^lesson-(\d{2}):session:/.exec(
      learningV2Progress.currentSessionId ?? "",
    );
    const parsedLessonOrdinal = Number(currentLessonMatch?.[1] ?? 1);
    const likelyLessonOrdinal =
      parsedLessonOrdinal >= 1 && parsedLessonOrdinal <= 32
        ? parsedLessonOrdinal
        : 1;
    const task = InteractionManager.runAfterInteractions(() => {
      prepareLearningV2Lesson(likelyLessonOrdinal);
    });
    return () => task.cancel();
  }, [learningV2Progress.currentSessionId, page, prepareLearningV2Lesson]);
  const toggleLearningV2Lesson = useCallback(
    (lessonOrdinal: number) => {
      setLearningV2DictionaryOpen(false);
      // Новые строки обязаны быть видимы уже на первом кадре. Поэтому анимируем
      // только сдвиг существующих карточек, без create-opacity для вставки.
      // Пока системная настройка движения не прочитана, ведём себя консервативно.
      if (learningV2ReduceMotionPreference === false) {
        animateNextLayoutShiftWithoutEntryFade(160);
      }
      setExpandedLearningV2Lesson((current) =>
        current === lessonOrdinal ? null : lessonOrdinal,
      );
    },
    [learningV2ReduceMotionPreference],
  );
  const selectedLearningV2CatalogSession = selectedLearningV2Session
    ? (learningV2Catalog?.lessons[selectedLearningV2Session.lessonOrdinal - 1]
        ?.sessions[selectedLearningV2Session.sessionOrdinal - 1] ?? null)
    : null;
  const selectedLearningV2OutcomeKind =
    selectedLearningV2CatalogSession?.learningOutcomeKind ??
    (selectedLearningV2Session
      ? neutralLearningV2SessionOutcomeKind(
          selectedLearningV2Session.sessionOrdinal,
        )
      : "understand");
  const selectedLearningV2Outcome =
    selectedLearningV2CatalogSession?.learningOutcome ??
    (selectedLearningV2Session
      ? neutralLearningV2SessionOutcome(
          selectedLearningV2Session.sessionOrdinal,
          lang,
        )
      : "");
  const selectedLearningV2NewWordCount = selectedLearningV2Session && studyTarget === "en"
    ? factoryNativeLearningV2NewWordCountV1(
        selectedLearningV2Session.lessonOrdinal,
        selectedLearningV2Session.sessionOrdinal,
      )
    : null;
  // зачем (владелец 11.10: «ТАМ ДОЛЖНО ПОКАЗЫВАТЬСЯ СТОЛЬКО СКОЛЬКО ДОСТУПНО»): множество занятий, которые игрок видит и
  // может открыть, — написанные И выпущенные (собираются из бандла, непрерывный префикс курса). Им пользуются карта,
  // прогрев и вход в занятие — одно правило на всех. Кнопка массовой разблокировки (только дев) показывает все написанные.
  const learningV2FactoryNativeSessionIds = useMemo(() => {
    const authored = factoryNativeLearningV2AvailabilityV1().sessions;
    const shown = learningV2DevUnlockAllActive
      ? authored
      : authored.filter((session) => isLearningV2SessionReleasedV1(session.lessonOrdinal, session.sessionOrdinal));
    if (__DEV__) {
      console.log('[V2-AVAILABILITY] shown', JSON.stringify({ authored: authored.length, shown: shown.length, devUnlockAll: learningV2DevUnlockAllActive }));
    }
    return new Set(shown.map((session) => session.courseSessionId));
  }, [learningV2DevUnlockAllActive]);
  type LearningV2PreparedSessionLaunch = Readonly<{
    key: string;
    sessionRunId: string;
    handle: LearningV2CourseSessionReadyHandleV3 | null;
  }>;
  const learningV2PreparedLaunchesRef = useRef(
    new Map<string, Promise<LearningV2PreparedSessionLaunch>>(),
  );
  const learningV2ModalRequestRef = useRef(0);
  const learningV2PreparationScope = `${studyTarget}:${lang}:${learningV2Catalog?.environment ?? "production"}:${learningV2Catalog?.seasonId ?? "learning-v2"}`;
  const learningV2PreparationScopeRef = useRef(learningV2PreparationScope);
  if (learningV2PreparationScopeRef.current !== learningV2PreparationScope) {
    learningV2PreparationScopeRef.current = learningV2PreparationScope;
    learningV2PreparedLaunchesRef.current.clear();
  }
  const learningV2PreparationKeyFor = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) =>
      `${lessonOrdinal}:${sessionOrdinal}:${learningV2PreparationScope}`,
    [learningV2PreparationScope],
  );
  const selectedLearningV2PreparationKey = selectedLearningV2Session
    ? learningV2PreparationKeyFor(
        selectedLearningV2Session.lessonOrdinal,
        selectedLearningV2Session.sessionOrdinal,
      )
    : null;
  const prepareLearningV2SessionBeforeModal = useCallback(
    (
      lessonOrdinal: number,
      sessionOrdinal: number,
    ): Promise<LearningV2PreparedSessionLaunch> => {
      const key = learningV2PreparationKeyFor(lessonOrdinal, sessionOrdinal);
      const cached = learningV2PreparedLaunchesRef.current.get(key);
      if (cached) return cached;
      // зачем (R09): подготовка (клиент V3 + срок 12 с) — общая с Главной; здесь только кэш карты по ключу занятия
      const operation = prepareLearningV2SessionRunV1(
        {
          environment: learningV2Catalog?.environment ?? "production",
          seasonId: learningV2Catalog?.seasonId ?? "learning-v2",
          studyTarget,
          learnerSourceLocale: lang,
          lessonOrdinal,
          sessionOrdinal,
        },
        { devUnlockedDrafts: learningV2DevUnlockAllActive && studyTarget === "en" },
      ).then((ready) => ({ key, ...ready }));
      let guarded: Promise<LearningV2PreparedSessionLaunch>;
      guarded = operation.catch((error) => {
        if (learningV2PreparedLaunchesRef.current.get(key) === guarded) {
          learningV2PreparedLaunchesRef.current.delete(key);
        }
        throw error;
      });
      learningV2PreparedLaunchesRef.current.set(key, guarded);
      while (learningV2PreparedLaunchesRef.current.size > 8) {
        const oldest = learningV2PreparedLaunchesRef.current.keys().next().value as string | undefined;
        if (!oldest || oldest === key) break;
        learningV2PreparedLaunchesRef.current.delete(oldest);
      }
      return guarded;
    },
    [
      lang,
      learningV2Catalog?.environment,
      learningV2Catalog?.seasonId,
      learningV2DevUnlockAllActive,
      learningV2PreparationKeyFor,
      studyTarget,
    ],
  );

  const markLearningV2PreparedLaunchTrace = useCallback(
    (traceId: string, prepared: LearningV2PreparedSessionLaunch) => {
      if (!prepared.handle) {
        const readyAtMs = Date.now();
        markLearningV2SessionLaunchStageV1({
          traceId,
          stage: "material_ready",
          atMs: readyAtMs,
        });
        markLearningV2SessionLaunchStageV1({
          traceId,
          stage: "audio_ready",
          atMs: readyAtMs,
        });
        return;
      }
      // зачем: handle выдаёт сам ленивый модуль — значит к этому моменту он уже
      // загружен, и тайминг берётся синхронно, без лишнего then вокруг трассы.
      const sessionClient = peekLearningV2SessionClientV3();
      if (!sessionClient) {
        // Немой ранний выход запрещён: трасса без тайминга — это дыра в
        // диагностике запуска, владелец должен видеть причину в логе.
        DebugLogger.error(
          "learning_v2:launch_trace_timing_module_missing",
          new Error(
            `handle есть, но модуль клиента сессии не загружен (traceId=${traceId})`,
          ),
          "warning",
        );
        return;
      }
      const timing = sessionClient.getLearningV2CourseSessionReadyTimingV3(
        prepared.handle,
      );
      markLearningV2SessionLaunchStageV1({
        traceId,
        stage: "material_ready",
        atMs: timing.materialReadyAtMs,
      });
      markLearningV2SessionLaunchStageV1({
        traceId,
        stage: "audio_ready",
        atMs: timing.audioReadyAtMs,
      });
    },
    [],
  );

  const currentLearningV2SessionCoordinates = useMemo(() => {
    const match = /^lesson-(\d+):session:(\d+)$/.exec(
      learningV2Progress.currentSessionId ?? "",
    );
    if (!match) return null;
    return {
      lessonOrdinal: Number(match[1]),
      sessionOrdinal: Number(match[2]),
    };
  }, [learningV2Progress.currentSessionId]);

  // Learning V2 session launch warms canonical text only. Device TTS needs no
  // downloaded asset, pack coordinator, or post-frame audio preparation.

  // зачем: этот проп вызывается для КАЖДОЙ строки карты внутри её рендера.
  // Инлайновая стрелка меняла идентичность на каждый рендер экрана и срывала
  // мемоизацию renderItem — FlatList перестраивал все видимые строки
  // (аудит 20.09, причина №2).
  const isLearningV2SessionMaterialAvailable = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) =>
      studyTarget !== "en" ||
      learningV2FactoryNativeSessionIds.has(
        learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal),
      ),
    [learningV2FactoryNativeSessionIds, studyTarget],
  );
  const currentLessonOrdinal = currentLearningV2SessionCoordinates?.lessonOrdinal ?? 1;
  const prepareLearningV2SessionLaunch = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) =>
      prepareLearningV2SessionBeforeModal(lessonOrdinal, sessionOrdinal),
    [prepareLearningV2SessionBeforeModal],
  );
  const prewarmLearningV2SessionLaunch = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) =>
      prepareLearningV2SessionBeforeModal(lessonOrdinal, sessionOrdinal),
    [prepareLearningV2SessionBeforeModal],
  );

  const prewarmCurrentLearningV2SessionOnEntry = useCallback(() => {
    const current = currentLearningV2SessionCoordinates;
    if (!current) {
      // Ранний выход обязан называть причину (правило «сперва логи»).
      if (__DEV__) {
        console.log('[V2-PREWARM] skip', JSON.stringify({ reason: 'no_current_coordinates' }));
      }
      return;
    }
    // зачем: владелец 21.09 — «кружок не нажимается первые пару секунд… всё
    // должно быть мгновенно, загрузки только в фоне и ЗАРАНЕЕ, чтобы вообще до
    // входа на карту». Грелось только текущее занятие, поэтому сразу после его
    // прохождения следующий тап снова был холодным. Греем пару: текущее и
    // следующее. Обе подготовки fire-and-forget — они наполняют кэш промисов
    // learningV2PreparedLaunchesRef и НИКОГДА не стоят на пути нажатия.
    // зачем (R08 🔴, координатор + Advisor 15.10, замер CPU): две подготовки сразу — 5 сборок материала и SHA-256 на чистом JS одной
    // цепочкой микрозадач — держали JS-поток 6–10 с: карта не рисовалась, касания ждали. Теперь греем текущее, следующее — после него.
    const targets = [
      { lessonOrdinal: current.lessonOrdinal, sessionOrdinal: current.sessionOrdinal },
      { lessonOrdinal: current.lessonOrdinal, sessionOrdinal: current.sessionOrdinal + 1 },
    ] as const;
    const warmAt = (index: number): void => {
      const target = targets[index];
      if (!target) return;
      if (target.sessionOrdinal > 56) {
        if (__DEV__) {
          console.log('[V2-PREWARM] skip', JSON.stringify({ ...target, reason: 'beyond_last_session' }));
        }
        return;
      }
      const courseSessionId = learningV2CourseSessionIdV1(
        target.lessonOrdinal,
        target.sessionOrdinal,
      );
      if (
        studyTarget === "en" &&
        !learningV2FactoryNativeSessionIds.has(courseSessionId)
      ) {
        if (__DEV__) {
          console.log('[V2-PREWARM] skip', JSON.stringify({ courseSessionId, reason: 'not_authored' }));
        }
        return;
      }
      const startedAt = Date.now();
      if (__DEV__) console.log('[V2-PREWARM] start', JSON.stringify({ courseSessionId }));
      void prewarmLearningV2SessionLaunch(
        target.lessonOrdinal,
        target.sessionOrdinal,
      )
        .then(() => {
          if (__DEV__) {
            console.log('[V2-PREWARM] ready', JSON.stringify({ courseSessionId, ms: Date.now() - startedAt }));
          }
          warmAt(index + 1);
        })
        .catch((error) => {
          // зачем: владелец 21.09 — в журнале была одна безымянная строка
          // отказа, и по ней нельзя было понять, КАКОЕ занятие не прогрелось
          // (падало второе, а выглядело как общий сбой). Теперь занятие
          // названо, и видно, сколько времени прошло до отказа.
          if (__DEV__) {
            console.log('[V2-PREWARM] failed', JSON.stringify({
              courseSessionId,
              ms: Date.now() - startedAt,
              reason: String(error),
            }));
          }
          DebugLogger.error(
            `learning_v2:current_session_entry_prewarm:${courseSessionId}`,
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
        });
    };
    warmAt(0);
  }, [
    currentLearningV2SessionCoordinates,
    learningV2FactoryNativeSessionIds,
    prewarmLearningV2SessionLaunch,
    studyTarget,
  ]);

  useEffect(() => {
    if (
      page !== "v2" ||
      !lessonsRuntimeActive ||
      !learningV2ProgressHydrated
    )
      return;
    // зачем: ЗАМЕР НА ЭМУЛЯТОРЕ 20.09. От тапа до первого кадра карты
    // проходило 5,5–7,5 секунды. Логи показали, что модель строится 4–32 мс,
    // а layout 1 мс — время съедал НЕ рендер. В окне ожидания стояли СЕМЬ
    // сборок мусора подряд (13–23 МБ каждая, сотни LOS-объектов) и следом
    // предупреждение learning_v2:lesson_audio_pack_prepare. Это подготовка
    // материала и аудио текущего занятия: она стартовала СРАЗУ по входу и
    // душила JS-поток, пока человек смотрел на пустой экран.
    //
    // Раньше комментарий обещал, что прогрев идёт «пока на экране вступление»
    // — но вступление мгновенное, и прогрев приходился ровно на первый кадр.
    //
    // зачем: владелец 21.09 — «загрузки должны быть ЗАРАНЕЕ, чтобы вообще до
    // входа на карту», «при этом ничего не стопорится, все кнопки обязаны
    // нажиматься мгновенно с первого раза». Откладывание на два кадра сдвигало
    // подготовку ровно в то окно, когда человек уже видит карту и тапает по
    // кружку: занятие ещё не готово. Запускаем сразу, как только известен
    // прогресс — это раньше первого кадра карты.
    //
    // Инцидент 20.09 при этом НЕ возвращается: там поток душила синхронная
    // работа на первом кадре, а здесь подготовка остаётся fire-and-forget и
    // ничего не держит. Тап не зависит от неё ни в одной ветке — обработчик
    // ставит состояние модалки синхронно и лишь НАБЛЮДАЕТ промис.
    // 17.10: здесь стояло «пропуск виден || revealCourse» — revealCourse был ровно «раздел V2 открыт и активен»; пропуск удалён.
    if (page === "v2" && lessonsRuntimeActive) {
      // зачем (R08 🔴, 15.10): «запускаем сразу» (21.09) клало тяжёлую подготовку на первый кадр карты — JS-поток стоял 6–10 с, карта не
      // появлялась, все касания ждали. Прогрев — после анимаций входа и ещё 600 мс; уход с карты отменяет. Тап по занятию по-прежнему
      // не ждёт прогрев: модалка открывается сразу, подготовка идёт по тапу, если кэша ещё нет.
      // зачем (R08, замер координатора на 5554, 08b9e168e): подготовка занятия всё ещё держит JS ~13 с (хэш и сборка — у Ядра). Пусть это
      // окно приходится на паузу, а не на касания: прогрев стартует, когда экран «Обучения» 2,5 с не трогали (касание сбрасывает отсчёт).
      // Тап по занятию готовит его сам и прогрева не ждёт.
      const IDLE_BEFORE_PREWARM_MS = 2500;
      const scheduledAt = Date.now();
      lastLessonsTouchAtRef.current = scheduledAt;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const waitIdle = () => {
        const idleMs = Date.now() - lastLessonsTouchAtRef.current;
        if (idleMs < IDLE_BEFORE_PREWARM_MS) {
          timer = setTimeout(waitIdle, IDLE_BEFORE_PREWARM_MS - idleMs + 50);
          return;
        }
        timer = null;
        console.log('[R08-PREP] entry_prewarm:run', JSON.stringify({ sinceScheduledMs: Date.now() - scheduledAt, idleMs })); // guard-ok: одна строка на вход
        prewarmCurrentLearningV2SessionOnEntry();
      };
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(waitIdle, IDLE_BEFORE_PREWARM_MS);
      });
      return () => {
        task.cancel?.();
        if (timer) clearTimeout(timer);
      };
    }
    return undefined;
  }, [
    learningV2ProgressHydrated,
    lessonsRuntimeActive,
    page,
    prewarmCurrentLearningV2SessionOnEntry,
  ]);

  const handleLearningV2ExpandedLesson = useCallback(
    (lessonOrdinal: number | null) => {
      lastLessonsTouchAtRef.current = Date.now();
      setExpandedLearningV2Lesson(lessonOrdinal);
      // зачем (поручение владельца через координатора 18.10): открыл урок на карте — запоминаем локально сразу (память + диск в фоне, без сети)
      if (lessonOrdinal !== null) rememberLearningV2LastLesson(studyTarget, lessonOrdinal, "map_open");
    },
    [studyTarget],
  );

  const handleLearningV2VisibleSessionsSettled = useCallback(
    (
      lessonOrdinal: number,
      sessions: readonly Readonly<{
        sessionOrdinal: number;
        state: LearningV2AccordionSessionStateV1;
      }>[],
    ) => {
      // Раскрытие главы — пользовательское действие, а не период простоя.
      // Раньше отсюда materialize/hash блокировал следующий tap. Сохраняем
      // сигнал активности; единый idle-прогрев сам выберет безопасный момент.
      void lessonOrdinal;
      void sessions;
      lastLessonsTouchAtRef.current = Date.now();
    },
    [],
  );

  // зачем: «спокойный отказ» закрытого узла (спека mock 08, макет A3) — тап по
  // закрытой сессии называет точную предпосылку вместо мёртвой тишины. Плашка
  // абсолютная (нет сдвига layout), живёт 2.2с, reduce motion показывает сразу.
  const [learningV2DenialHint, setLearningV2DenialHint] = useState<
    string | null
  >(null);
  const learningV2DenialHintTimers = useRef<{
    hide: ReturnType<typeof setTimeout> | null;
    unmount: ReturnType<typeof setTimeout> | null;
  }>({ hide: null, unmount: null });
  const learningV2DenialHintProgress = useSharedValue(0);
  const learningV2DenialHintStyle = useAnimatedStyle(() => ({
    opacity: learningV2DenialHintProgress.value,
    transform: [{ translateY: (1 - learningV2DenialHintProgress.value) * 8 }],
  }));
  const clearLearningV2DenialHintTimers = useCallback(() => {
    const timers = learningV2DenialHintTimers.current;
    if (timers.hide) clearTimeout(timers.hide);
    if (timers.unmount) clearTimeout(timers.unmount);
    timers.hide = null;
    timers.unmount = null;
  }, []);
  useEffect(() => clearLearningV2DenialHintTimers, [clearLearningV2DenialHintTimers]);
  // зачем (Сверка 05.10: «жму Начать — окно закрылось, сообщения нет», хотя prepare_failed hint=unavailable_now
  // пишется): лог полного пути подсказки — когда вызвали, когда она реально встала на экран (эффект ниже) и когда
  // спрятали. Так видно, показывается ли она вообще, на сколько и не перекрыта ли закрывающимся окном.
  const learningV2DenialHintShownAtRef = useRef<number | null>(null);
  const showLearningV2DenialHint = useCallback(
    (text: string) => {
      clearLearningV2DenialHintTimers();
      learningV2DenialHintShownAtRef.current = Date.now();
      console.log(`[V2-LAUNCH] hint:show text="${text.slice(0, 60)}" modalOpenAtShow=${selectedLearningV2SessionOpenRef.current}`);
      setLearningV2DenialHint(text);
      const instant = learningV2ReduceMotionPreference !== false;
      learningV2DenialHintProgress.value = withTiming(1, {
        duration: instant ? 1 : 200,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      });
      learningV2DenialHintTimers.current.hide = setTimeout(() => {
        learningV2DenialHintProgress.value = withTiming(0, {
          duration: instant ? 1 : 200,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
        learningV2DenialHintTimers.current.unmount = setTimeout(
          () => {
            const shownAt = learningV2DenialHintShownAtRef.current;
            console.log(`[V2-LAUNCH] hint:hidden visibleMs=${shownAt === null ? "unknown" : Date.now() - shownAt}`);
            setLearningV2DenialHint(null);
          },
          instant ? 16 : 220,
        );
      }, 2200);
    },
    [
      clearLearningV2DenialHintTimers,
      learningV2DenialHintProgress,
      learningV2ReduceMotionPreference,
    ],
  );
  const launchSelectedLearningV2Session = useCallback((skipIntro: boolean) => {
    const selected = selectedLearningV2Session;
    if (!selected || !selectedLearningV2PreparationKey) return;
    const launchRequest = ++learningV2ModalRequestRef.current;
    const v2StartTapAtMs = Date.now(); // зачем (координатор 15.10, #18): замер тап «Начать» → переход на экран урока; после R08 подготовка бывала до 13 с
    console.log(`[V2-START] tap ${JSON.stringify({ lesson: selected.lessonOrdinal, session: selected.sessionOrdinal, skipIntro, prepared: learningV2PreparedLaunchesRef.current.has(selectedLearningV2PreparationKey) })}`); // guard-ok: начало замера
    const sessionId = learningV2CourseSessionIdV1(
      selected.lessonOrdinal,
      selected.sessionOrdinal,
    );
    const prepared =
      learningV2PreparedLaunchesRef.current.get(
        selectedLearningV2PreparationKey,
      ) ??
      prepareLearningV2SessionLaunch(
        selected.lessonOrdinal,
        selected.sessionOrdinal,
      );
    const modalExit = new Promise<void>((resolve) => {
      setTimeout(
        resolve,
        learningV2ReduceMotionPreference !== false
          ? 0
          : LEARNING_V2_SESSION_MODAL_EXIT_MS,
      );
    });
    // The handler returns immediately. Preparation and the 180 ms exit motion
    // overlap; routing happens only after both are complete, without a loader.
    void Promise.all([prepared, modalExit])
      .then(([ready]) => {
        if (learningV2ModalRequestRef.current !== launchRequest) return;
        markLearningV2PreparedLaunchTrace(selected.traceId, ready);
        learningV2PreparedLaunchesRef.current.delete(
          selectedLearningV2PreparationKey,
        );
        // зачем: handle выдал сам ленивый модуль — передача синхронная и не задерживает переход (общая с Главной, R09)
        stageLearningV2ReadyHandoffV1(ready.handle);
        console.log(`[V2-START] ready ${JSON.stringify({ lesson: selected.lessonOrdinal, session: selected.sessionOrdinal, tapToReadyMs: Date.now() - v2StartTapAtMs })}`); // guard-ok: подготовка закончена, дальше переход
        setSelectedLearningV2Session(null);
        requestAnimationFrame(() => {
          if (__DEV__) {
            console.log(
              "[V2-PAGE] push:session",
              JSON.stringify({ sessionId, sessionRunId: ready.sessionRunId, from: "lessons.tsx:modalLaunch" }),
            );
          }
          router.push(learningV2SessionHrefV1({
            sessionId,
            lessonOrdinal: selected.lessonOrdinal,
            sessionOrdinal: selected.sessionOrdinal,
            environment: learningV2Catalog?.environment ?? "production",
            seasonId: learningV2Catalog?.seasonId ?? "learning-v2",
            repeat: selected.state === "completed",
            sessionRunId: ready.sessionRunId,
            skipIntro,
            devUnlockedDrafts: learningV2DevUnlockAllActive && studyTarget === "en",
          }) as never);
        });
      })
      .catch((error) => {
        if (learningV2ModalRequestRef.current !== launchRequest) return;
        setSelectedLearningV2Session(null);
        // зачем: владелец 21.09 — «нажала 20 раз». Раньше отказ подготовки
        // ЗАКРЫВАЛ модалку молча: человек нажал «Начать» и не получил ничего,
        // поэтому жал снова и снова. Теперь отказ всегда объясняется.
        //
        // зачем (22.09): showLearningV2DenialHint объявлена ВЫШЕ этого хука —
        // блок подсказки перенесён сюда намеренно. Прежде он стоял ниже, и его
        // имя в массиве зависимостей (вычисляется В РЕНДЕРЕ, а не по тапу) дало
        // ReferenceError на каждом рендере экрана уроков. Класс бага «const выше
        // объявления» (21.09) — tsc ловит его только как TS2448/TS2454, поэтому
        // держать объявление выше ВСЕХ хуков, которые упоминают его в deps.
        // зачем (инцидент 04.10, D158): урок 1 «молча» не открывался — подсказка «Проверь связь» вводила в заблуждение, потому что у
        // английских занятий сети в подготовке нет вовсе (материал из бандла): отказ значит «нет локального материала», а не «нет связи».
        // Причина пишется в лог ([V2-LAUNCH]) на каждом отказе, текст честный: «Сейчас недоступно» и приглашение попробовать снова.
        const prepareFailureReason = error instanceof Error ? error.message : String(error);
        const bundledUnavailable = prepareFailureReason === "learning_v2_factory_session_unavailable";
        console.warn(`[V2-LAUNCH] prepare_failed session=${sessionId} reason=${prepareFailureReason} bundledUnavailable=${bundledUnavailable ? "yes" : "no"} hint=${bundledUnavailable ? "unavailable_now" : "check_connection"}`);
        showLearningV2DenialHint(bundledUnavailable ? triLang(lang, {
          ru: "Сейчас недоступно. Попробуй снова чуть позже",
          en: "Not available right now. Please try again a little later",
          uk: "Зараз недоступно. Спробуй ще раз трохи пізніше",
          es: "No disponible ahora. Inténtalo de nuevo un poco más tarde",
          "pt-BR": "Indisponível agora. Tente de novo daqui a pouco",
          vi: "Hiện chưa dùng được. Hãy thử lại sau ít phút",
          id: "Belum tersedia sekarang. Coba lagi sebentar lagi",
          tr: "Şu anda kullanılamıyor. Biraz sonra tekrar dene",
          pl: "Chwilowo niedostępne. Spróbuj ponownie za chwilę",
        }) : triLang(lang, {
          ru: "Занятие не подготовилось. Проверь связь и попробуй ещё раз",
          en: "The session didn't load. Check your connection and try again",
          uk: "Заняття не підготувалося. Перевір зв'язок і спробуй ще раз",
          es: "La sesión no se cargó. Revisa tu conexión e inténtalo de nuevo",
          "pt-BR": "A sessão não carregou. Verifique a conexão e tente de novo",
          vi: "Buổi học chưa tải xong. Kiểm tra kết nối và thử lại",
          id: "Sesi gagal dimuat. Periksa koneksi lalu coba lagi",
          tr: "Oturum yüklenmedi. Bağlantını kontrol edip tekrar dene",
          pl: "Sesja się nie wczytała. Sprawdź połączenie i spróbuj ponownie",
        }));
        DebugLogger.error(
          `learning_v2:session_launch_prepare:${sessionId}`,
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
      });
  }, [
    lang,
    learningV2Catalog?.environment,
    learningV2Catalog?.seasonId,
    learningV2DevUnlockAllActive,
    learningV2ReduceMotionPreference,
    markLearningV2PreparedLaunchTrace,
    prepareLearningV2SessionLaunch,
    router,
    selectedLearningV2PreparationKey,
    selectedLearningV2Session,
    showLearningV2DenialHint,
    studyTarget,
  ]);
  // Витрина звёзд 0–3 за пройденные сессии: подписка на локальное хранилище,
  // без авторитета над прогрессом и без сети.
  const [learningV2StarResults, setLearningV2StarResults] =
    useState<LearningV2SessionStarResultsV1>(() =>
      peekLearningV2SessionStarResults(),
    );
  useEffect(() => {
    const refresh = () =>
      setLearningV2StarResults(peekLearningV2SessionStarResults());
    const unsubscribe = subscribeLearningV2SessionStarResults(refresh);
    refresh();
    return unsubscribe;
  }, []);
  const handleLearningV2SessionPress = useCallback(
    (
      selectedLesson: number,
      sessionOrdinal: number,
      state: LearningV2AccordionSessionStateV1,
    ) => {
      if (!learningV2LessonIsAccessible(selectedLesson, isPremium) && !learningV2DevUnlockAllActive) {
        // зачем (learning-v2-013, «сперва логи»): каждый ранний выход тапа говорит, какая ветка и почему.
        console.warn('[V2-TAP] denied:plus', JSON.stringify({ lesson: selectedLesson, session: sessionOrdinal, state, isPremium })); // guard-ok: ранний выход логируется
        showLearningV2DenialHint(triLang(lang, {
          ru: "Уроки 3+ доступны в Plus",
          en: "Lessons 3+ are available in Plus",
          uk: "Уроки 3+ доступні в Plus",
          es: "Las lecciones 3+ están disponibles en Plus",
          "pt-BR": "As lições 3+ estão disponíveis no Plus",
          vi: "Bài 3+ có trong Plus",
          id: "Pelajaran 3+ tersedia di Plus",
          tr: "3+ dersleri Plus'ta kullanılabilir",
          pl: "Lekcje 3+ są dostępne w Plus",
        }));
        return;
      }
      const selectedCourseSessionId = learningV2CourseSessionIdV1(
        selectedLesson,
        sessionOrdinal,
      );
      if (
        studyTarget === "en" &&
        !learningV2FactoryNativeSessionIds.has(selectedCourseSessionId)
      ) {
        console.warn('[V2-TAP] denied:wip', JSON.stringify({ courseSessionId: selectedCourseSessionId, state })); // guard-ok: ранний выход логируется
        showLearningV2DenialHint(triLang(lang, {
          ru: "Сессия ещё в работе",
          en: "This session is still in progress",
          uk: "Сесія ще в роботі",
          es: "Esta sesión todavía está en preparación",
          "pt-BR": "Esta sessão ainda está em preparação",
          vi: "Buổi học này vẫn đang được hoàn thiện",
          id: "Sesi ini masih dalam pengerjaan",
          tr: "Bu oturum hâlâ hazırlanıyor",
          pl: "Ta sesja jest jeszcze przygotowywana",
        }));
        return;
      }
      if (
        !learningV2DevUnlockAllActive &&
        state !== "current" &&
        state !== "completed"
      ) {
        // зачем: раньше здесь шёл find по ВСЕМ строкам карты. После перехода
        // на сплошную карту их стало 2048, и массив попадал в зависимости
        // обработчика — тот пересоздавался на каждое изменение прогресса, а
        // вместе с ним и вся ветка нажатия. Номер текущего занятия и так есть
        // в прогрессе: читаем его оттуда, без обхода карты.
        const currentMatch = /^lesson-(\d{2}):session:(\d{2})$/.exec(
          learningV2Progress.currentSessionId ?? "",
        );
        const currentOrdinal =
          currentMatch && Number(currentMatch[1]) === selectedLesson
            ? Number(currentMatch[2])
            : null;
        // зачем (learning-v2-013): здесь тап по закрытому занятию уходит в подсказку, а окно «Закрытое занятие»
        // (learning-v2.html 2.4) не открывается. Печатаем значения, решившие ветку.
        console.warn('[V2-TAP] denied:locked', JSON.stringify({
          courseSessionId: selectedCourseSessionId, state, devUnlock: learningV2DevUnlockAllActive,
          currentSessionId: learningV2Progress.currentSessionId ?? null, currentOrdinal, shown: 'locked_sheet',
        })); // guard-ok: ранний выход логируется
        // зачем (learning-v2-013, координатор 05.10): для закрытого ЗАНЯТИЯ — окно 2.4 вместо тоста (тост 1.9 — только для
        // уроков). Мгновенно, без сети и без прогрева запуска.
        setLearningV2LockedSession({ lessonOrdinal: selectedLesson, sessionOrdinal });
        return;
      }
      const traceId = startLearningV2SessionLaunchTraceV1({
        courseSessionId: selectedCourseSessionId,
      });
      const request = ++learningV2ModalRequestRef.current;
      // Metadata is already in memory, so the modal mounts in this tap's
      // synchronous state update. Preparation is observed, never awaited here.
      //
      // зачем: владелец 21.09 — «все кнопки обязаны нажиматься мгновенно с
      // первого раза, ничего не стопорится». Лог показывает, был ли узел уже
      // прогрет к моменту тапа; открытие модалки от этого НЕ зависит.
      if (__DEV__) {
        console.log('[V2-TAP] press', JSON.stringify({
          courseSessionId: selectedCourseSessionId,
          state,
          prewarmed: learningV2PreparedLaunchesRef.current.has(
            learningV2PreparationKeyFor(selectedLesson, sessionOrdinal),
          ),
        }));
      }
      setSelectedLearningV2Session({
        lessonOrdinal: selectedLesson,
        sessionOrdinal,
        state,
        traceId,
      });
      void prewarmLearningV2SessionLaunch(selectedLesson, sessionOrdinal)
        .then((prepared) => {
          if (learningV2ModalRequestRef.current !== request) return;
          markLearningV2PreparedLaunchTrace(traceId, prepared);
        })
        .catch((error) => {
          if (learningV2ModalRequestRef.current !== request) return;
          DebugLogger.error(
            "learning_v2:session_prepare_before_modal",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
        });
    },
    [
      isPremium,
      lang,
      learningV2DevUnlockAllActive,
      learningV2Progress.currentSessionId,
      learningV2FactoryNativeSessionIds,
      learningV2PreparationKeyFor,
      markLearningV2PreparedLaunchTrace,
      prewarmLearningV2SessionLaunch,
      showLearningV2DenialHint,
      studyTarget,
    ],
  );
  const handleLearningV2SessionModalMounted = useCallback(() => {
    const traceId = selectedLearningV2Session?.traceId;
    if (!traceId) return;
    markLearningV2SessionLaunchStageV1({
      traceId,
      stage: "modal_mounted",
    });
  }, [selectedLearningV2Session?.traceId]);
  const handleLessonsBack = useCallback(() => {
    // зачем (координатор 17.10, «назад» на карте V2 срабатывал с задержкой 3–6 с; «сперва логи»): [BACK-BTN] — экран, значения, которые решают ветку, и время тапа; итог — в эффектах ниже
    let canGoBack: boolean | null = null;
    try {
      canGoBack = router.canGoBack();
    } catch (error) {
      console.warn(`[BACK-BTN] canGoBack не прочитался (${error instanceof Error ? error.message : String(error)})`);
    }
    noteBackTap(page === "v2" ? "v2_map" : page === "dialogs" ? "dialogs" : "legacy_lessons", "header_back_button", { page, isRetainedTab, initialPage, canGoBack, v2CanOpen: learningV2CanOpen });
    if (page !== "lessons") {
      if (!isRetainedTab && initialPage === "v2") {
        noteBackDecision("push_v2_route → safeRouterBack");
        safeRouterBack(router, HOME_BACK_FALLBACK as any);
        return;
      }
      // зачем (владелец 17.10): корневая вкладка открывается на карте V2 — «назад» с неё ведёт на Главную, а не в старый список (в него ведёт кнопка «Классический курс»)
      if (isRetainedTab && page === "v2") {
        console.log("[LESSONS-TABS] назад с карты V2 → Главная"); // guard-ok: итог нажатия «назад»
        noteBackDecision("tab_v2_map → goHome");
        goHome();
        return;
      }
      noteBackDecision("page_other → setPage(lessons)", { from: page });
      setPage("lessons");
      return;
    }
    if (isRetainedTab) {
      // зачем (владелец 17.10): старый список открыт кнопкой с карты — «назад» возвращает на новые уроки; без доступной карты (рубильник/нет занятий) — на Главную, как раньше
      if (learningV2CanOpen) {
        console.log("[LESSONS-TABS] назад из старого списка → карта V2"); // guard-ok: итог нажатия «назад»
        noteBackDecision("tab_legacy_list → setPage(v2)");
        setPage("v2");
        return;
      }
      noteBackDecision("tab_legacy_list_no_v2 → goHome");
      goHome();
      return;
    }
    noteBackDecision("push_legacy_list → safeRouterBack");
    safeRouterBack(router, HOME_BACK_FALLBACK as any);
  }, [goHome, initialPage, isRetainedTab, learningV2CanOpen, page, router]);
  // зачем ([BACK-BTN]): итог тапа «назад» — страница сменилась, вкладка скрыта (ушли на другую) или экран закрыт; время от тапа печатает noteBackArrived
  const backProbePageRef = useRef(page);
  useEffect(() => {
    if (backProbePageRef.current === page) return;
    noteBackArrived("lessons_tab", `page_${backProbePageRef.current}→${page}`);
    backProbePageRef.current = page;
  }, [page]);
  useEffect(() => {
    if (!lessonsTabVisible) noteBackArrived("lessons_tab", "tab_hidden");
  }, [lessonsTabVisible]);
  useEffect(() => () => noteBackArrived("lessons_tab", "unmount"), []);
  const openDialogs = useCallback(() => {
    if (page === "dialogs") return;
    hapticTap();
    if (!dialogAccess) {
      openPremiumPaywall(router, { context: "ai_dialog" });
      return;
    }
    setPage("dialogs");
  }, [dialogAccess, page, router]);
  const [gateModal, setGateModal] = useState<
    | null
    | {
        kind: "exam";
        level: string;
      }
    | {
        kind: "lesson";
        prevNum: number;
        /** Сам закрытый урок — его и предлагаем открыть за жемчужины. */
        lessonNum: number;
      }
    | {
        kind: "levelGate";
        level: string;
        prevLevel: string;
        /** Урок на границе уровня — его тоже можно открыть за жемчужины. */
        lessonNum: number;
      }
    | {
        kind: "frenchExam";
        level: string;
      }
    | {
        kind: "premium";
        lessonNum: number;
      }
  >(null);
  // зачем (владелец 2026-08-30, раунд 5): тап по заблокированному контенту —
  // вежливый отказ с низкой нотой (pm.ui.tap_blocked). Одна точка на все пять
  // видов гейта: звук идёт на ПОЯВЛЕНИЕ модалки блокировки, а не на каждый
  // setGateModal-вызов.
  const gateModalKind = gateModal?.kind ?? null;
  useEffect(() => {
    if (gateModalKind === null) return;
    soundDirector.request('pm.ui.tap_blocked', { scope: 'lessons-gate' });
  }, [gateModalKind]);
  // зачем (learn-5): время от тапа до коммита окна ворот и до следующего кадра; animFullMs — собственная анимация
  // шелла (LUM.ladder[1] + LUM.resolveMs), её прибавлять к tapToFrameMs, чтобы получить «окно видно полностью».
  useEffect(() => {
    if (gateModalKind === null) return;
    const tapAt = lessonsGateTapAtMs;
    lessonsGateTapAtMs = null;
    const commitAt = Date.now();
    const tapToCommitMs = tapAt === null ? null : commitAt - tapAt;
    requestAnimationFrame(() => {
      const frameAt = Date.now();
      console.warn('[LESSONS-GATE-OPEN]', JSON.stringify({
        kind: gateModalKind,
        tapSeen: tapAt !== null,
        tapToCommitMs,
        commitToFrameMs: frameAt - commitAt,
        tapToFrameMs: tapAt === null ? null : frameAt - tapAt,
        animFullMs: LUM.ladder[1] + LUM.resolveMs,
      })); // guard-ok: временная трассировка learn-5, одна строка на открытие окна
    });
  }, [gateModalKind]);

  // зачем: D107/D70 — покупка урока за жемчуг удалена, уже купленные уроки читаются из lessons_pearl_unlock_storage
  const mountedRef = useRef(true);
  const scoresLoadRef = useRef<{
    target: string;
    promise: Promise<LessonsTabSnapshot>;
  } | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // Сброс скролла при показе таба удалён вместе с самим табом: каждый push
  // маунтит список заново (offset 0), а при возврате из урока позицию,
  // наоборот, нужно сохранять.
  const loadScores = useCallback(async () => {
    try {
      let entry = scoresLoadRef.current;
      if (!entry || entry.target !== lessonCacheTarget) {
        const nextEntry = {
          target: lessonCacheTarget,
          promise: loadLessonsTabStateFromStorage(studyTarget),
        };
        entry = nextEntry;
        scoresLoadRef.current = nextEntry;
        nextEntry.promise.then(
          () => {
            if (scoresLoadRef.current === nextEntry) {
              scoresLoadRef.current = null;
            }
          },
          () => {
            if (scoresLoadRef.current === nextEntry) {
              scoresLoadRef.current = null;
            }
          },
        );
      }
      const snapshot = await entry.promise;
      if (!mountedRef.current || entry.target !== lessonCacheTargetRef.current)
        return;
      examBestPctTargetRef.current = entry.target;
      setNoLimits(snapshot.noLimits);
      setLegacyFreeLessonCap(snapshot.legacyFreeLessonCap);
      setPersistedUnlocked(snapshot.persistedUnlocked);
      // Слияние, а не замена: снапшот мог быть прочитан ДО того, как покупка
      // дописала урок на диск. Поздний ответ не должен затирать свежую покупку
      // (last-write-guard, как в истории с осколками).
      setPurchasedLessons((prev) =>
        Array.from(new Set([...prev, ...snapshot.purchasedLessons])).sort((a, b) => a - b),
      );
      setScores(snapshot.scores);
      setProgCounts(snapshot.progCounts);
      setPassCounts(snapshot.passCounts);
      setExamResults(snapshot.examResults);
      setExamBestPcts(snapshot.examBestPcts);
      setExamPassCounts(snapshot.examPassCounts);
      writeLessonsUiSessionCache(lessonCacheTarget, snapshot);
    } catch (e) {
      // ignore
      DebugLogger.error('lessons:snapshot', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, [lessonCacheTarget, studyTarget]);
  useFocusEffect(
    useCallback(() => {
      if (isRetainedTab) return;
      void loadScores();
    }, [isRetainedTab, loadScores]),
  );
  useEffect(() => {
    if (!lessonsTabVisible) return;
    // В V2 прокрутку к текущему занятию делает отдельный эффект ниже: он
    // объявлен после listData, от которого зависит.
    if (page !== "v2") {
      scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    }
    void loadScores();
  }, [focusTick, isRetainedTab, lessonsTabVisible, loadScores, page]);
  perfR1BodyMark('lessons', 'before_lessons_memo', perfBodyStart);
  const lessons = useMemo(() => {
    const legacyTitles = lessonNamesForStudyTarget(lang, studyTarget);
    // System currently owns one exact reviewed title set. Keep it intact for
    // every interface locale until owner-reviewed title translations exist;
    // generated fallback labels such as “English · Lesson 1” are forbidden.
    if (page === "v2" && studyTarget === "en") return LEARNING_V2_OWNER_EN_TITLES_RU;
    if (page !== "v2" || !learningV2Catalog) return legacyTitles;
    return legacyTitles.map(
      (name, index) => learningV2Catalog.lessons[index]?.title ?? name,
    );
  }, [lang, learningV2Catalog, page, studyTarget]);
  const premiumReachableLevelIndex = useMemo(() => {
    let idx = getCourseLevelIndex("A1");
    if (examResults.A1?.passed) idx = Math.max(idx, getCourseLevelIndex("A2"));
    if (examResults.A2?.passed) idx = Math.max(idx, getCourseLevelIndex("B1"));
    if (examResults.B1?.passed || examResults.B2?.passed)
      idx = Math.max(idx, getCourseLevelIndex("B2"));
    for (let i = 0; i < 32; i++) {
      const lessonNum = i + 1;
      if (
        (scores[i] ?? 0) > 0 ||
        (progCounts[i] ?? 0) > 0 ||
        (passCounts[i] ?? 0) > 0
      ) {
        idx = Math.max(
          idx,
          getCourseLevelIndex(getCourseLevelForLesson(lessonNum)),
        );
      }
    }
    for (const lessonNum of persistedUnlocked) {
      idx = Math.max(
        idx,
        getCourseLevelIndex(getCourseLevelForLesson(lessonNum)),
      );
    }
    return idx;
  }, [examResults, passCounts, persistedUnlocked, progCounts, scores]);
  const unlockedLessons = useMemo(() => {
    // зачем (владелец 22.09, «все уроки отмечены как открыты — запрещённое
    // поведение»): effectiveDevContentUnlock — это DEV_CONTENT_UNLOCK, БЕЗУСЛОВНАЯ
    // константа любой дев-сборки (app/config.ts), а не тестерский флаг с диска.
    // Список рисовал ВСЕ 32 урока открытыми просто потому что сборка дев, а
    // реальный вход (lesson_menu.tsx: isTesterNoLimitsActive) требует ЯВНО
    // включённого tester_no_limits и честно блокирует урок — отсюда «на карте
    // открыт, при тапе выбрасывает назад». Список обязан считать ТАК ЖЕ, как
    // реальная проверка: только effectiveNoLimits (тот же диск-флаг).
    if (effectiveNoLimits)
      return new Array(32).fill(true);
    const u = new Array(32).fill(false);
    // Зачёты уровней — они открывают уроки на границах 9/19/29.
    const passedExams: Record<string, boolean> = {};
    for (const [lvl, res] of Object.entries(examResults)) {
      if (res?.passed) passedExams[lvl] = true;
    }
    // зачем (D121/D122): Plus-проекция тоже получает сохранённый список открытых
    // (grandfathering уроков, открытых по старому порогу 40%) и legacy-потолок.
    if (isPremium) {
      return buildPremiumLessonUnlocks({
        scores,
        purchasedLessons,
        persistedUnlocked,
        legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
        lessonCount: u.length,
      });
    }
    return buildSequentialFreeLessonUnlocks({
      scores,
      persistedUnlocked,
      purchasedLessons,
      passedExams,
      lessonCount: u.length,
      legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
    });
  }, [
    effectiveLegacyFreeLessonCap,
    effectiveNoLimits,
    examResults,
    isPremium,
    persistedUnlocked,
    purchasedLessons,
    scores,
  ]);
  type ListItem =
    | {
        kind: "header";
        label: CourseLevel;
        color: string;
      }
    | {
        kind: "lesson";
        index: number;
        name: string;
      }
    | {
        kind: "v2_chapter";
        row: Extract<
          LearningV2CourseAccordionRowV1,
          { kind: "chapter" }
        >;
      }
    | {
        kind: "v2_session";
        row: Extract<
          LearningV2CourseAccordionRowV1,
          { kind: "session" }
        >;
      }
    | {
        kind: "exam";
        level: CourseLevel;
      }
    | {
        kind: "attestation";
      };
  perfR1BodyMark('lessons', 'before_list_data', perfBodyStart);
  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
    if (page === "v2") {
      // зачем: карту в V2 рисует LearningV2PulseCourse, а этот список — экран
      // старых уроков. После перехода на сплошную карту модель отдаёт 2048
      // строк вместо 95, и мы перемалывали их на КАЖДОЕ изменение прогресса
      // впустую: на экран они не попадают. Владелец 20.09: «что-то блокирует
      // вход и нажатие, раздел должен открываться мгновенно».
      return data;
    }
    const headers: [number, CourseLevel][] = [
      [1, "A1"],
      [9, "A2"],
      [19, "B1"],
      [29, "B2"],
    ];
    lessons.forEach((name, index) => {
      const num = index + 1;
      const header = headers.find(([firstLesson]) => firstLesson === num);
      if (header)
        data.push({
          kind: "header",
          label: header[1],
          color: bookPalette(num, themeMode, levelInkGlass),
        });
      data.push({ kind: "lesson", index, name });
      if (num === 8 || num === 18 || num === 28) {
        data.push({
          kind: "exam",
          level: num <= 8 ? "A1" : num <= 18 ? "A2" : "B1",
        });
      }
      if (num === 32) data.push({ kind: "attestation" });
    });
    return data;
  }, [lang, lessons, page, themeMode, levelInkGlass]);
  const currentLessonNum = useMemo(() => {
    const idx = unlockedLessons.findIndex(
      (unlocked, i) => unlocked && (progCounts[i] ?? 0) < 50,
    );
    return idx >= 0 ? idx + 1 : null;
  }, [progCounts, unlockedLessons]);
  const legacyFilteredListData = useMemo(() => {
    // зачем (аудит 2026-09-21, одобрено владельцем): поиск по урокам. Запрос
    // непустой → ищем по ВСЕМУ курсу, игнорируя выбранный уровень: человек
    // ищет «прошедшее время», а не «прошедшее время внутри A1». Фильтрация
    // локальная, по уже загруженному списку — 0 чтений Firestore.
    const query = legacyLessonQuery.trim().toLocaleLowerCase();
    if (query) {
      const matches = listData.filter((item) => {
        if (item.kind !== "lesson") return false;
        const lessonNumber = item.index + 1;
        return (
          item.name.toLocaleLowerCase().includes(query)
          || String(lessonNumber) === query
        );
      });
      // зачем (learn.html A3): найденные уроки идут под заголовками своих уровней,
      // как в макете. Только вид: состав найденного тот же, заголовки берём из listData.
      const grouped: ListItem[] = [];
      let lastLevel: CourseLevel | null = null;
      for (const item of matches) {
        if (item.kind !== "lesson") continue;
        const level = getCourseLevelForLesson(item.index + 1);
        if (level !== lastLevel) {
          const header = listData.find(
            (entry) => entry.kind === "header" && entry.label === level,
          );
          if (header) grouped.push(header);
          lastLevel = level;
        }
        grouped.push(item);
      }
      return grouped;
    }
    // зачем: владелец 21.09 — «убери A1 A2 B1 B2 кнопочки вверху, пусть всё
    // будет списком как было когда-то». Здесь стоял фильтр по выбранному
    // уровню: он резал список до одного уровня и прятал чужие экзамены с
    // аттестацией. Фильтр не нужен — listData УЖЕ собран как сплошной поток:
    // заголовок уровня перед уроками 1/9/19/29, экзамен после 8/18/28,
    // аттестация после 32. Границы уровней человек видит прямо в прокрутке.
    return listData;
  }, [legacyLessonQuery, listData]);
  // зачем: карта V2 стала сплошной, и «текущее» занятие может лежать в
  // тысячах строк от начала. Ведём список к нему по индексу строки; высоты
  // строк разные (плашка урока / глава / занятие), поэтому арифметику по
  // высоте не строим — просим FlatList, а на промах отвечаем штатным
  // обработчиком onScrollToIndexFailed ниже.
  const scrollLearningV2ToCurrent = useCallback(
    (animated: boolean) => {
      const index = legacyFilteredListData.findIndex(
        (item) => item.kind === "v2_session" && item.row.state === "current",
      );
      if (index < 0) {
        // Ранний выход обязан называть причину (правило «сперва логи»).
        if (__DEV__) {
          console.log(
            "[V2-MAP] scrollToCurrent:skip",
            JSON.stringify({ reason: "no_current_row", rows: legacyFilteredListData.length }),
          );
        }
        return;
      }
      try {
        scrollRef.current?.scrollToIndex?.({
          index,
          animated,
          viewPosition: 0.4,
        });
      } catch (e) {
        // Немой catch запрещён: список мог ещё не смериться.
        if (__DEV__) {
          console.log(
            "[V2-MAP] scrollToCurrent:failed",
            JSON.stringify({ index, reason: e instanceof Error ? e.message : String(e) }),
          );
        }
      }
    },
    [legacyFilteredListData],
  );
  // зачем: карта сплошная — открывать раздел на уроке 1, когда человек уже
  // на уроке 5, значит заставить его крутить десятки экранов вручную.
  useEffect(() => {
    if (!lessonsTabVisible || page !== "v2") return;
    scrollLearningV2ToCurrent(false);
  }, [focusTick, lessonsTabVisible, page, scrollLearningV2ToCurrent]);
  const openLegacyLessons = useCallback(() => {
    setLearningV2DictionaryOpen(false);
    setExpandedLearningV2Lesson(null);
    // зачем: здесь выставлялся уровень текущего урока, чтобы список открылся
    // на нужном разделе. Список теперь сплошной (владелец 21.09), уровень
    // выбирать не нужно — человек просто листает.
    console.log("[V2-MAP] openLegacyLessons", JSON.stringify({ instanceId: instanceIdRef.current, from: "legacy_lessons_intro_or_button" })); // зачем (Б11): кто возвращает экран на список A1
    setPage("lessons");
  }, [setPage]);
  const legacyLessonsIntroDef = featureIntroById(
    "legacy_lessons_first_visit",
  )!;
  const legacyLessonsIntro = useRequestedFeatureIntro(
    "legacy_lessons_first_visit",
    lessonsRuntimeActive &&
      page === "v2" &&
      selectedLearningV2Session === null &&
      !learningV2DictionaryOpen,
    openLegacyLessons,
  );
  const requestLegacyLessonsIntro = legacyLessonsIntro.request;
  const requestLegacyLessons = useCallback(() => {
    hapticTap();
    console.log("[V2-MAP] classic_course:tap", JSON.stringify({ instanceId: instanceIdRef.current, from: "chapters_map_button" })); // guard-ok: тап «Классический курс»
    void requestLegacyLessonsIntro();
  }, [requestLegacyLessonsIntro]);
  // зачем (владелец 17.10, название предложил координатор): короткое человеческое имя кнопки, открывающей старый список; слова «старые» нет (владелец 21.09 его отверг).
  // Заголовок самого списка остаётся «Обучение» (legacyLessonsScreenTitle) — это разные тексты.
  const classicCourseLabel = triLang(lang, {
    ru: "Классический курс",
    en: "Classic course",
    uk: "Класичний курс",
    es: "Curso clásico",
    "pt-BR": "Curso clássico",
    vi: "Khóa học cổ điển",
    id: "Kursus klasik",
    tr: "Klasik kurs",
    pl: "Kurs klasyczny",
  });
  // зачем: чип «Новые уроки» остаётся на экране как обещание будущего, но пока
  // курс не дописан он недоступен. Ответ на тап — строка под чипом, мгновенно и
  // локально (никакой сети, никакого модала поверх урока). Мягкий хаптик, чтобы
  // тап не выглядел «проваленным»: человек чувствует, что кнопка его услышала.
  const [learningV2LockedNoticeVisible, setLearningV2LockedNoticeVisible] =
    useState(false);
  // зачем: владелец 2026-09-21 — «написано "Старые уроки", а должно быть
  // "Обучение"». Раньше (2026-09-13) дев-сборка звала раздел «Старые уроки»,
  // чтобы отличать его от страницы нового курса рядом. Владелец увидел это имя
  // на телефоне и отверг: для человека это единственный курс, а «старые» звучит
  // как свалка. Теперь имя ОДНО во всех сборках — различать ветки по названию
  // раздела больше не пытаемся, для этого есть чип «Новые уроки» рядом.
  // Это имя — ЕДИНСТВЕННОЕ место, где живёт название раздела. Его же берёт проп
  // legacyLessonsLabel у страницы нового курса (кнопка возврата сюда), чтобы
  // надпись на кнопке и заголовок экрана, куда она ведёт, не могли разъехаться.
  const legacyLessonsScreenTitle = triLang(lang, {
    ru: "Обучение",
    en: "Learning",
    uk: "Навчання",
    es: "Aprendizaje",
    "pt-BR": "Aprendizado",
    vi: "Học tập",
    id: "Pembelajaran",
    tr: "Öğrenme",
    pl: "Nauka",
  });
  const openNewLessons = useCallback(() => {
    if (!learningV2CanOpen) {
      // зачем: надпись встаёт в поток и сдвигает список — без этого вставка
      // прыгает рывком (правило стабильности вёрстки в AGENTS.md).
      animateNextLayoutTransition();
      setLearningV2LockedNoticeVisible(true);
      void hapticSoftImpact();
      return;
    }
    hapticTap();
    // [V2-OPEN] Точка отсчёта входа в раздел. Остаётся навсегда: по ней
    // меряется всё остальное, если вход снова начнёт тормозить.
    if (__DEV__) {
      (globalThis as { __v2OpenT0?: number }).__v2OpenT0 = Date.now();
      console.log("[V2-OPEN] tap", JSON.stringify({ from: "openNewLessons", instanceId: instanceIdRef.current, runtimeOwnerId, visible: lessonsTabVisible }));
    }
    // зачем (R08 🔴, диагноз Advisor 15.10): setPage прямо в onPress удалял нажатую кнопку вместе со всем каталогом во время её нативной
    // анимации отпускания — React коммитил карту, а натив не получал кадр до СЛЕДУЮЩЕГО касания (карты не было, таббар не прятался,
    // chapters:layout приходил только после тапа по другой вкладке). Смена страницы — на следующем кадре, когда отпускание завершено.
    const tapAt = Date.now();
    requestAnimationFrame(() => {
      console.log("[V2-OPEN] setPage:raf", JSON.stringify({ instanceId: instanceIdRef.current, sinceTapMs: Date.now() - tapAt })); // guard-ok: одна строка на вход
      setPage("v2");
      // зонды R08: идут ли кадры после коммита (setTimeout 0 / rAF) — если карта снова не появится, видно, где встал вывод на экран
      setTimeout(() => console.log("[V2-MAP] after-commit:timeout0", JSON.stringify({ sinceTapMs: Date.now() - tapAt })), 0); // guard-ok: зонд R08
      requestAnimationFrame(() => console.log("[V2-MAP] after-commit:raf", JSON.stringify({ sinceTapMs: Date.now() - tapAt }))); // guard-ok: зонд R08
    });
  }, [learningV2CanOpen, setPage, runtimeOwnerId, lessonsTabVisible]);
  // зачем (владелец 2026-09-17): вход в «комбинированный урок» — несколько тем
  // вперемешку. Гейт Plus/Pro стоит ЗДЕСЬ, до перехода: выбор тем — платная
  // механика, и показывать экран, с которого нельзя стартовать, значит обмануть.
  // Переход мгновенный, без ожидания сети: isPremium уже разрешён в этом экране
  // (usePremium), поэтому кнопка отвечает в том же кадре.
  const openCombinedLesson = useCallback(() => {
    hapticTap();
    if (!isPremium) {
      // зачем: ранний выход обязан называть причину (правило «сперва логи»).
      if (__DEV__) console.log('[COMBO-ENTRY] press:denied', JSON.stringify({ isPremium }));
      openPremiumPaywall(router, { context: "combined_lesson" });
      return;
    }
    if (__DEV__) console.log('[COMBO-ENTRY] press:ok → /combined_lesson_pick');
    if (!navOnce('lessons:combined_pick')) return; // зачем (аудит R58 #17, 15.10): двойной тап — один экран выбора
    router.push('/combined_lesson_pick');
  }, [isPremium, router]);
  // зачем: затухание справа у ряда кнопок нужно, только если ряд реально листается
  // (крупный шрифт/узкий экран). Два замера на монтаж — дёшево, без работы в кадрах.
  const [legacyRailWidth, setLegacyRailWidth] = useState(0);
  const [legacyRailContentWidth, setLegacyRailContentWidth] = useState(0);
  const legacyRailOverflows =
    legacyRailWidth > 0 && legacyRailContentWidth > legacyRailWidth + 1;
  // зачем: здесь жила подкрутка рельсы к выбранному уровню
  // (доводка + ref на рельсу). Она подкручивала чип B2 в
  // зону видимости на узком экране. Чипов уровней больше нет (владелец
  // 21.09: «убери A1 A2 B1 B2 кнопочки вверху»), доводить нечего.
  // Keep this dense list stable: JS-driven per-card scroll scale made cards jitter.
  const itemAnims = useMemo(() => listData.map(() => null), [listData]);
  const handleLessonsScroll = useCallback(
    (e: any) => {
      topFadeScroll?.onScroll?.(e);
      onBouncyScroll(e);
    },
    [onBouncyScroll, topFadeScroll],
  );
  // Страховка от «экран уехал вниз»: после отпускания пальца/инерции у верхнего
  // края возвращаем резинку в 0, чтобы над списком не оставалась пустая полоса.
  const handleLessonsScrollEnd = useCallback(
    (e: any) => {
      const y = e?.nativeEvent?.contentOffset?.y ?? 0;
      if (y <= 0 && bouncyStretch.value !== 0) {
        bouncyStretch.value = withSpring(0, { damping: 22, stiffness: 240 });
      }
      // зачем (learn-2, Сверка: после очистки поиска список пустеет на несколько экранов, ошибок нет): высота содержимого
      // против числа строк — огромная contentHeight при малом числе отрисованных строк = виртуализация/устаревшие замеры.
      console.warn('[LESSONS-LIST] scroll_end', JSON.stringify({
        offsetY: Math.round(y),
        contentHeight: Math.round(e?.nativeEvent?.contentSize?.height ?? -1),
        layoutHeight: Math.round(e?.nativeEvent?.layoutMeasurement?.height ?? -1),
        rows: legacyFilteredListData.length,
        queryLength: legacyLessonQuery.trim().length,
      })); // guard-ok: временная трассировка learn-2
    },
    [bouncyStretch, legacyFilteredListData.length, legacyLessonQuery],
  );
  // зачем (learn-2): каждая смена данных списка — сколько строк и под каким запросом (длина, без текста).
  useEffect(() => {
    console.warn('[LESSONS-LIST] data', JSON.stringify({
      rows: legacyFilteredListData.length,
      queryLength: legacyLessonQuery.trim().length,
      firstKinds: legacyFilteredListData.slice(0, 4).map((item) => item.kind),
    })); // guard-ok: временная трассировка learn-2
  }, [legacyFilteredListData, legacyLessonQuery]);
  // Премиум-урок: открываем пейвол СРАЗУ, без промежуточного окна «урок входит в премиум».
  // (Раньше тап показывал ThemedChoiceModal с кнопкой «Получить Premium» — лишний шаг.)
  const openLessonPaywall = useCallback(
    (lessonNum: number) => {
      openPremiumPaywall(router, {
        context: lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap),
        // зачем (learn-014, координатор 13.10): пилюля пейвола читает «закрытый урок = lessons_done + 1» (paywallEntryFactsFromParams), поэтому тут — НОМЕР ТАПНУТОГО урока − 1, как в lesson_premium_gate.
        // Раньше было число пройденных: у человека с 0 пройденных тап по уроку 4 давал пилюлю «Урок 1 закрыт».
        lessons_done: Math.max(0, lessonNum - 1),
        ...lessonPurchaseContinuationParams(lessonNum),
      });
    },
    [effectiveLegacyFreeLessonCap, router],
  );
  // зачем (владелец 2026-09-30, перенос списка на Liquid Glass): тот же обработчик нажатия,
  // что жил внутри LessonCard для старой ветки — вынесен наверх, чтобы стеклянная карточка
  // оставалась чистой разметкой. Ветка levelLockedByExam там всегда была false (см.
  // renderLessonCard), поэтому её здесь нет — поведение то же самое.
  const handleLegacyLessonPress = useCallback(
    (num: number) => {
      hapticTap();
      const accessInput = applyDevAsFreeToLessonAccess({
        lessonId: num,
        unlocked: Boolean(unlockedLessons[num - 1]),
        purchased: purchasedLessons.includes(num),
        isPremium,
        devMode: effectiveDevContentUnlock,
        noLimits: effectiveNoLimits,
        legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
      }, 'lessons_list');
      const access = resolveLessonAccess(accessInput);
      logLessonGateDecision('list', {
        lesson: num, access, isPremium: accessInput.isPremium, devMode: accessInput.devMode ?? false, noLimits: effectiveNoLimits,
        purchased: purchasedLessons.includes(num), unlocked: Boolean(unlockedLessons[num - 1]),
        cap: effectiveLegacyFreeLessonCap ?? null, levelLockedByExam: false,
      });
      if (access === "available") {
        // зачем (аудит Optimistic UI Уроков, 13.10): два быстрых тапа по карточке открывали два меню урока — синхронный замок на ключ урока.
        if (!navOnce(`lessons:menu:${num}`)) return;
        void prefetchLessonMenuCache(num, studyTarget);
        router.push({ pathname: "/lesson_menu", params: { id: num } });
      } else if (access === "premium_required") {
        openLessonPaywall(num);
      } else {
        setGateModal({ kind: "lesson", prevNum: num - 1, lessonNum: num });
      }
    },
    [
      effectiveDevContentUnlock,
      effectiveLegacyFreeLessonCap,
      effectiveNoLimits,
      isPremium,
      openLessonPaywall,
      purchasedLessons,
      router,
      studyTarget,
      unlockedLessons,
    ],
  );
  // зачем (R1 L1, координатор 12.10): нажатие аттестации — стабильная ссылка, иначе memo-плашка перерисовывалась на каждом коммите корня.
  const openDiagnosticTest = useCallback(() => {
    hapticTap();
    if (!navOnce('lessons:diagnostic')) return; // зачем (аудит R58 #17, 15.10): двойной тап — один диагностический тест
    router.push("/diagnostic_test");
  }, [router]);
  // зачем (R1 L1): у экзаменов нажатие замыкает ~10 значений экрана. Стабильная обёртка на уровень зовёт ПОСЛЕДНЮЮ версию обработчика из ref
  // (ref обновляется на каждом рендере, нажатие всегда читает свежие данные) — ссылка пропса не меняется, плашка экзамена не перерисовывается впустую.
  const examPressImplRef = useRef<Record<string, () => void>>({});
  const examPressStable = useMemo(() => {
    const make = (lvl: string) => () => examPressImplRef.current[lvl]?.();
    return { A1: make("A1"), A2: make("A2"), B1: make("B1"), B2: make("B2") } as Record<string, () => void>;
  }, []);
  perfR1BodyMark('lessons', 'before_render_helpers', perfBodyStart);
  // ── Exam card (Liquid Glass `.exc` макета learn.html) ──
  const renderExamCard = (lvl: string): React.ReactNode => {
    const [from, to] =
      lvl === "A1"
        ? [1, 8]
        : lvl === "A2"
          ? [9, 18]
          : lvl === "B1"
            ? [19, 28]
            : [29, 32];
    // PM-152: порог зачёта из единой процентной шкалы (90%, прежние 4.5) — тот же,
    // что в tryUnlockLevelExam, чтобы карточка и реальный гейт не расходились.
    const scoreReady = allLessonScoresMeetPercent(
      scores.slice(from - 1, to),
      LEVEL_EXAM_UNLOCK_LESSON_PERCENT,
    );
    const examLevel = lvl as CourseLevel;
    const examLevelIdx = getCourseLevelIndex(examLevel);
    const premiumExamAvailable =
      isPremium && examLevelIdx <= premiumReachableLevelIndex;
    const examPremiumRequired =
      !isPremium &&
      !effectiveDevContentUnlock &&
      !effectiveNoLimits &&
      requiresPremiumForLesson(to, effectiveLegacyFreeLessonCap);
    const examSourceAvailable = examContentAvailableForTarget(studyTarget);
    const allDone =
      examSourceAvailable &&
      !examPremiumRequired &&
      (effectiveDevContentUnlock ||
        effectiveNoLimits ||
        premiumExamAvailable ||
        scoreReady);
    const prevExamLevel = getPreviousCourseLevel(examLevel);
    const result = examResults[lvl];
    const isB2 = lvl === "B2";
    const currentTargetStateBestPct =
      examBestPctTargetRef.current === lessonCacheTarget
        ? (examBestPcts[lvl] ?? 0)
        : 0;
    const overlayBestPct =
      studyTarget === "en" || studyTarget === "fr"
        ? peekCurrentExamBestPct(studyTarget, examLevel)
        : 0;
    // зачем: медальные точки сняты в 2.0 (spec_learn «Удалено»); лучший результат
    // остаётся — его озвучивает карточка экзамена для чтения экрана.
    const examBestPct = Math.max(currentTargetStateBestPct, overlayBestPct);
    const label = triLang(lang, {
      ru: isB2 ? "Экзамен" : `Экзамен ${lvl}`,
      en: isB2 ? "Exam" : `${lvl} exam`,
      uk: isB2 ? "Екзамен" : `Залік ${lvl}`,
      es: isB2 ? "Examen" : `Examen de ${lvl}`,
      "pt-BR": isB2 ? "Exame" : `Exame ${lvl}`,
      vi: isB2 ? "Bài kiểm tra" : `Bài kiểm tra ${lvl}`,
      id: isB2 ? "Ujian" : `Ujian ${lvl}`,
      tr: isB2 ? "Sınav" : `${lvl} sınavı`,
      pl: isB2 ? "Egzamin" : `Egzamin ${lvl}`,
    });
    // зачем (learn-4/8, координатор 05.10): порядок статусов — в pickLessonsExamStatus (сданный → нужен Plus →
    // «Почти» только при pct > 0 → прежняя цепочка). Тексты прежние.
    const examStatusKind = pickLessonsExamStatus({
      result, examPremiumRequired, examSourceAvailable, allDone, isPremium, prevExamLevel,
    });
    const subLine = examStatusKind === "passed" || examStatusKind === "almost"
      ? examStatusKind === "passed" && result
        ? triLang(lang, {
            // зачем: макет learn.html A5 — «Сдан — 92%» без эмодзи-галочки.
            ru: `Сдан — ${result.pct}%`,
            en: `Passed — ${result.pct}%`,
            uk: `Здано — ${result.pct}%`,
            es: `Superado — ${result.pct}%`,
            "pt-BR": `Aprovado — ${result.pct}%`,
            vi: `Đã vượt qua — ${result.pct}%`,
            id: `Lulus — ${result.pct}%`,
            tr: `Geçildi — ${result.pct}%`,
            pl: `Zdane — ${result.pct}%`,
          })
        // зачем (аудит по Библии, 2026-08-26): голый крестик с процентом бил
        // по несдавшему (Часть V п.6). Рядом стоит «✅ Сдано» — держим тот же
        // тон: называем результат без приговора и зовём вернуться.
        : triLang(lang, {
            ru: `Почти — ${result?.pct ?? 0}%`, uk: `Майже — ${result?.pct ?? 0}%`, en: `Almost — ${result?.pct ?? 0}%`,
            es: `Casi — ${result?.pct ?? 0}%`, 'pt-BR': `Quase — ${result?.pct ?? 0}%`, vi: `Suýt rồi — ${result?.pct ?? 0}%`,
            id: `Hampir — ${result?.pct ?? 0}%`, tr: `Az kaldı — ${result?.pct ?? 0}%`, pl: `Prawie — ${result?.pct ?? 0}%`,
          })
      : examStatusKind === "plus"
        ? triLang(lang, {
            ru: "Откроется с Plus",
            en: "Unlocks with Plus",
            uk: "Відкриється з Plus",
            es: "Se abre con Plus",
            "pt-BR": "Abre com Plus",
            vi: "Mở với Plus",
            id: "Terbuka dengan Plus",
            tr: "Plus ile açılır",
            pl: "Otwiera się z Plus",
          })
      : examStatusKind === "source_unavailable"
        ? frenchExamGateCopy("level", lang).title
        : examStatusKind === "start"
          ? triLang(lang, {
              ru: "Нажми, чтобы начать",
              en: "Tap to start",
              uk: "Натисни, щоб почати",
              es: "Toca para empezar",
              "pt-BR": "Toque para começar",
              vi: "Nhấn để bắt đầu",
              id: "Ketuk untuk mulai",
              tr: "Başlamak için dokun",
              pl: "Dotknij, aby rozpocząć",
            })
          : examStatusKind === "prev_exam"
              ? triLang(lang, {
                  ru: `Сначала зачёт ${prevExamLevel}`,
                  en: `First, the ${prevExamLevel} exam`,
                  uk: `Спочатку залік ${prevExamLevel}`,
                  es: `Primero el examen ${prevExamLevel}`,
                  "pt-BR": `Primeiro o exame ${prevExamLevel}`,
                  vi: `Trước tiên là bài kiểm tra ${prevExamLevel}`,
                  id: `Ujian ${prevExamLevel} dulu`,
                  tr: `Önce ${prevExamLevel} sınavı`,
                  pl: `Najpierw egzamin ${prevExamLevel}`,
                })
              // зачем: макет пишет «на 2★», но проверка scoreReady выше требует 90%
              // (LEVEL_EXAM_UNLOCK_LESSON_PERCENT, выше 2★ = 60% по D121). Число порога
              // зачёта — открытый вопрос владельцу (PM-152); пока честно называем реальный.
              : triLang(lang, {
                  ru: `Заверши все уроки ${lvl} на 4.5+`,
                  en: `Complete all ${lvl} lessons with 4.5+`,
                  uk: `Заверши всі уроки ${lvl} на 4.5+`,
                  es: `Completa todas las lecciones de ${lvl} con nota mínima de 4,5`,
                  "pt-BR": `Conclua todas as lições ${lvl} com 4,5+`,
                  vi: `Hoàn thành tất cả bài học ${lvl} với 4.5+`,
                  id: `Selesaikan semua pelajaran ${lvl} dengan 4,5+`,
                  tr: `${lvl} seviyesindeki tüm dersleri 4.5+ ile tamamla`,
                  pl: `Ukończ wszystkie lekcje ${lvl} na 4,5+`,
                });
    // зачем (learn-4/8, Сверка: Free видит «Почти — 0%» вместо «Откроется с Plus»): какие входы решили статус экзамена.
    logOncePerKey('[LESSONS-EXAM] status', `${lvl}|${subLine}`, {
      level: lvl, hasResult: Boolean(result), resultPct: result?.pct ?? null, passed: result?.passed ?? null,
      examSourceAvailable, allDone, examPremiumRequired, isPremium, kind: examStatusKind, chosen: subLine,
    });
    // зачем (R1 L1): свежий обработчик кладём в ref, а в плашку отдаём стабильную обёртку — ссылка пропса не меняется между коммитами.
    examPressImplRef.current[lvl] = () => {
      markLessonsGateTap();
      hapticTap();
      const firstLessonByLevel =
        lvl === "A1" ? 1 : lvl === "A2" ? 9 : lvl === "B1" ? 19 : 29;
      if (examPremiumRequired) {
        openLessonPaywall(
          requiresPremiumForLesson(
            firstLessonByLevel,
            effectiveLegacyFreeLessonCap,
          )
            ? firstLessonByLevel
            : to,
        );
      } else if (!examSourceAvailable) {
        setGateModal({ kind: "frenchExam", level: lvl });
      } else if (allDone) {
        if (!navOnce(`lessons:level_exam:${lvl}`)) return; // зачем (аудит R58 #17, 15.10): двойной тап — один экзамен уровня
        router.push({ pathname: "/level_exam", params: { level: lvl } });
      } else if (isPremium && prevExamLevel) {
        setGateModal({
          kind: "levelGate",
          level: lvl,
          prevLevel: prevExamLevel,
          // зачем: соседняя сессия добавила механику «открыть урок за
          // жемчужины» и сделала lessonNum обязательным, но эту точку
          // вызова пропустила — сборка падала на типах. Берём первый урок
          // уровня: именно он стоит за этим гейтом, и именно его логично
          // предложить открыть. Саму механику не трогаем.
          lessonNum: firstLessonByLevel,
        });
      } else {
        setGateModal({ kind: "exam", level: lvl });
      }
    };
    return (
      <LessonsListGlassExamCard
        key={`e-${lvl}`}
        glass={learnGlass}
        level={lvl}
        title={label}
        status={subLine}
        faint={!allDone && !result}
        bestPct={examBestPct}
        onPress={examPressStable[lvl]}
      />
    );
  };

  // ── Lesson book: плашка урока как есть (рендер внутри карточки главы) ──
  const renderLessonCard = ({
    index,
    name,
    learningV2ProgressCount,
    learningV2IsCurrent,
    learningV2Available = true,
    learningV2InProgress = false,
    onLearningV2PressOverride,
  }: {
    index: number;
    name: string;
    learningV2ProgressCount?: number;
    learningV2IsCurrent?: boolean;
    learningV2Available?: boolean;
    learningV2InProgress?: boolean;
    onLearningV2PressOverride?: () => void;
  }): React.ReactNode => {
    const num = index + 1;
    if (page !== "v2") {
      // зачем (владелец 2026-09-30): старый каталог «Обучение» рисуется стеклянной карточкой
      // `.lc` из learn.html. Состояние считается из тех же данных, что и прежняя плашка
      // (unlockedLessons, progCounts, requiresPremiumForLesson), — доступ не меняется.
      const legacyUnlocked = Boolean(unlockedLessons[index]);
      const legacyPct = Math.min(100, Math.round(((progCounts[index] ?? 0) / 50) * 100));
      const legacyPremiumRequired =
        !isPremium &&
        !legacyUnlocked &&
        !effectiveNoLimits &&
        requiresPremiumForLesson(num, effectiveLegacyFreeLessonCap);
      const legacyState: LessonsListCardState = legacyPremiumRequired
        ? { kind: "plus" }
        : !legacyUnlocked
          ? { kind: "locked", prevNum: Math.max(1, num - 1) }
          : legacyPct >= 100
            ? { kind: "done", stars: lessonsListStarCount(scores[index]) }
            : legacyPct > 0
              ? { kind: "progress", pct: legacyPct }
              : { kind: "open" };
      return (
        <LessonsListGlassCard
          key={`l-${num}`}
          glass={learnGlass}
          lang={lang}
          num={num}
          name={name}
          state={legacyState}
          current={currentLessonNum === num}
          onPressLesson={handleLegacyLessonPress}
        />
      );
    }
    const isUnlocked = page === "v2" ? learningV2Available : unlockedLessons[index];
    const bg = page === "v2" && !learningV2Available
      ? isLightThemeMode(themeMode) ? EXEMPT_COLOR_21 : EXEMPT_COLOR_22
      : page === "v2" && learningV2InProgress
        ? darkenHexCached(bookPalette(num, themeMode, levelInkGlass), 0.1)
        : bookPalette(num, themeMode, levelInkGlass);
    const darkBg = darkenHexCached(bg, 0.42);
    const lightSurface = lightLessonCards && page === "v2" ? lessonCardLightSurface(bookPalette(num, themeMode, levelInkGlass), learnGlass) : null;
    const progPct =
      page === "v2"
        ? Math.min(100, Math.round(((learningV2ProgressCount ?? 0) / 56) * 100))
        : Math.min(100, Math.round(((progCounts[index] ?? 0) / 50) * 100));
    const isComplete = progPct >= 100;
    const isCurrent = page === "v2" ? Boolean(learningV2IsCurrent) : currentLessonNum === num;
    const lessonLevel = getCourseLevelForLesson(num);
    const lessonGoldLevel = goldCefrAccent(lessonLevel);
    const lessonAccent = bg;
    const prevLessonLevel = getPreviousCourseLevel(lessonLevel);
    // Plus no longer unlocks a reached section wholesale. A locked Plus lesson
    // is an ordinary sequential-progress lock, not an exam/level lock.
    const levelLockedByExam = false;
    const premiumRequired =
      page === "v2"
        ? false
        : !isPremium &&
          !isUnlocked &&
          !effectiveNoLimits &&
          requiresPremiumForLesson(num, effectiveLegacyFreeLessonCap);
    const purchasedLesson = page !== "v2" && purchasedLessons.includes(num);
    const showLessonProgressFill = isUnlocked && progPct > 0;
    const cardRadius = isGoldTheme || isOliveTheme ? 14 : 16;
    const lockedCardBaseColor = isGoldTheme
      ? goldSurface
      : lightSurface
        ? lightSurface.lockedFill[1] // зачем (п.81 (11)): под светлым градиентом закрытой плашки — светлая подложка, а не тёмная (иначе тёмная кайма на скруглении)
        : darkenHexCached(bg, 0.28);
    const cardLayerStyle = lessonCardLayerStyle(cardRadius); // зачем (R1 L1): стабильная ссылка на стиль, иначе memo плашки не срабатывает
    const lessonTextColor = lightSurface
      ? isUnlocked ? lightSurface.text : lightSurface.lockedText
      : isSagePorcelainTheme
      ? t.textPrimary
      : isGoldTheme
        ? isUnlocked
          ? t.textPrimary
          : EXEMPT_COLOR_23
        : !isUnlocked
          ? levelLockedByExam
            ? EXEMPT_COLOR_24
            : EXEMPT_COLOR_25
          : "rgba(255,255,255,0.97)"; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    const lessonMetaColor = lightSurface
      ? isUnlocked ? lightSurface.text : lightSurface.lockedText
      : isSagePorcelainTheme
      ? t.textPrimary
      : isGoldTheme
        ? isUnlocked
          ? t.textMuted
          : EXEMPT_COLOR_26
        : !isUnlocked
          ? levelLockedByExam
            ? EXEMPT_COLOR_27
            : EXEMPT_COLOR_28
          : // зачем (аудит-фикс): было LESSON_CARD_OPEN_META_TEXT (#07110A, тёмный) —
            // на разблокированной незалитой карточке фон здесь ВСЕГДА тёмный градиент
            // (см. lessonTextColor выше, тот же случай даёт rgba(255,255,255,0.97)).
            // Тёмный текст без тени на тёмном фоне давал контраст ~1:1.
            "rgba(255,255,255,0.97)"; // theme-exempt: карточка урока: заливка и чернила — палитра уровня/темы списка (токены A1–B2 — у сессии «Темы»); тени текста на заливке — чёрные в любой теме
    return (
      <LessonCard
        key={`l-${num}`}
        num={num}
        name={name}
        isUnlocked={isUnlocked}
        bg={bg}
        darkBg={darkBg}
        progPct={progPct}
        isComplete={isComplete}
        isCurrent={isCurrent}
        lessonLevel={lessonLevel}
        lessonGoldLevel={lessonGoldLevel}
        lessonAccent={lessonAccent}
        prevLessonLevel={prevLessonLevel}
        levelLockedByExam={levelLockedByExam}
        premiumRequired={premiumRequired}
        purchasedLesson={purchasedLesson}
        showLessonProgressFill={showLessonProgressFill}
        cardRadius={cardRadius}
        lockedCardBaseColor={lockedCardBaseColor}
        cardLayerStyle={cardLayerStyle}
        lessonTextColor={lessonTextColor}
        lessonMetaColor={lessonMetaColor}
        isGoldTheme={isGoldTheme}
        themeMode={themeMode}
        goldSurface={goldSurface}
        goldHairline={goldHairline}
        goldAntique={goldAntique}
        goldBright={goldBright}
        scaleAnim={null}
        lang={lang}
        f={f}
        openLessonPaywall={openLessonPaywall}
        setGateModal={setGateModal}
        router={router}
        studyTarget={studyTarget}
        isPremium={isPremium}
        effectiveDevContentUnlock={effectiveDevContentUnlock}
        noLimits={effectiveNoLimits}
        legacyFreeLessonCap={effectiveLegacyFreeLessonCap}
        textPrimary={t.textPrimary}
        textMuted={t.textMuted}
        learningV2={page === "v2"}
        learningV2Expanded={expandedLearningV2Lesson === num}
        learningV2InProgress={learningV2InProgress}
        onLearningV2PressIn={learningV2Available ? prepareLearningV2Lesson : undefined}
        onLearningV2Press={onLearningV2PressOverride ? lessonCardPressWrapper(onLearningV2PressOverride) : toggleLearningV2Lesson}
        lightSurface={lightSurface}
      />
    );
  };

  // ── Тела глав (плашки уроков + зачёт) мемоизированы ─────────────────────
  // Тап по шапке главы меняет только openChapters; без мемоизации каждый тап
  // перерендеривал все ~32 тяжёлые карточки уроков (градиенты/тени/SVG) —
  // отсюда подтормаживание раскрытия. Одинаковые ссылки на элементы дают
  // React bail-out, и раскрытие анимируется без JS-шторма.
  // ── Render ────────────────────────────────────────────────────────────────
  const learningV2DevUnlockControl = __DEV__ && ENABLE_DEV_TOOLS ? (
    <PressableHybrid
      testID="learning-v2-dev-unlock-all-sessions"
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: learningV2DevUnlockAllActive }}
      accessibilityLabel={triLang(lang, {
        ru: "Разблокировать все сессии для тестирования",
        en: "Unlock all sessions for testing",
        uk: "Розблокувати всі сесії для тестування",
        es: "Desbloquear todas las sesiones para pruebas",
        "pt-BR": "Desbloquear todas as sessões para testes",
        vi: "Mở tất cả buổi học để kiểm thử",
        id: "Buka semua sesi untuk pengujian",
        tr: "Test için tüm oturumları aç",
        pl: "Odblokuj wszystkie sesje do testów",
      })}
      onPress={() => {
        setLearningV2DevUnlockAllRequested((current) => { rememberLearningV2DevUnlockAll(!current); return !current; });
      }}
      variant="icon"
      style={{
        width: 36,
        height: 36,
        borderRadius: 13,
        backgroundColor: learningV2DevUnlockAllActive ? t.correct : t.bgCard,
      }}
      contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons
        name={learningV2DevUnlockAllActive ? "lock-open" : "lock-closed-outline"}
        size={17}
        color={learningV2DevUnlockAllActive ? t.correctText : t.textPrimary}
      />
    </PressableHybrid>
  ) : null;
  // зачем (learning-v2.html «Прохождение узла + полёт монет»): монеты с пройденного узла карты
  // «Главы» летят ровно в этот чип баланса.
  const learningV2CoinTargetRef = learningV2CoinTargetRefHolder;
  const learningV2ResourceHud = <View testID="learning-v2-resource-hud" style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 0 }}>
              {learningV2DevUnlockControl}
              {/* зачем (владелец 2026-09-21): «верни кнопку словаря в хедере».
                  Кнопка никуда не удалялась — она висела на условии
                  `expandedLearningV2Lesson !== null`, а раскрытых уроков после
                  перехода 20.09 на сплошную карту не существует, и условие не
                  выполнялось НИКОГДА. Теперь словарь про весь курс, поэтому
                  привязка к уроку снята целиком. */}
              {page === "v2" ? (
                <PressableHybrid
                  testID="learning-v2-map-dictionary-open"
                  accessibilityLabel={triLang(lang, {
                    ru: "Открыть словарь урока",
                    en: "Open lesson dictionary",
                    uk: "Відкрити словник уроку",
                    es: "Abrir el diccionario de la lección",
                    "pt-BR": "Abrir o dicionário da lição",
                    vi: "Mở từ điển bài học",
                    id: "Buka kamus pelajaran",
                    tr: "Ders sözlüğünü aç",
                    pl: "Otwórz słownik lekcji",
                  })}
                  onPress={() => setLearningV2DictionaryOpen(true)}
                  hitSlop={8}
                  variant="icon"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 15,
                    backgroundColor: t.bgCard,
                  }}
                  contentStyle={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="book-outline" size={21} color={t.accentText} />
                  {learningV2DictionaryWords.length > 0 ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        paddingHorizontal: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: t.accent,
                      }}
                    >
                      <Text
                        style={{
                          color: t.textOnGold,
                          fontSize: 13,
                          lineHeight: 17,
                          fontWeight: "700",
                        }}
                      >
                        {Math.min(99, learningV2DictionaryWords.length)}
                      </Text>
                    </View>
                  ) : null}
                </PressableHybrid>
              ) : null}
              <View
                ref={learningV2CoinTargetRef}
                collapsable={false}
                style={{ backgroundColor: t.bgCard, borderRadius: 999, paddingHorizontal: 7 }}
              >
                <RuneBalanceChip
                  testID="learning-v2-rune-balance"
                  color={t.textPrimary}
                  active={lessonsRuntimeActive && page === "v2"}
                  size={22}
                />
              </View>
              <EnergyBar
                size={24}
                maxWidth={88}
                ownerActive={lessonsRuntimeActive}
                compact
              />
  </View>;
  const legacyLessonsResourceHud = (
    <View
      testID="legacy-lessons-resource-hud"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        flexShrink: 0,
      }}
    >
      <PressableHybrid
        testID="legacy-lessons-liquid-resource"
        accessibilityLabel={triLang(lang, {
          ru: `Монеты: ${legacyCoinBalance ?? "не загружены"}`,
          en: `Coins: ${legacyCoinBalance ?? "not loaded"}`,
          uk: `Монети: ${legacyCoinBalance ?? "не завантажені"}`,
          es: `Monedas: ${legacyCoinBalance ?? "sin cargar"}`,
          "pt-BR": `Moedas: ${legacyCoinBalance ?? "não carregadas"}`,
          vi: `Xu: ${legacyCoinBalance ?? "chưa tải"}`,
          id: `Koin: ${legacyCoinBalance ?? "belum dimuat"}`,
          tr: `Jetonlar: ${legacyCoinBalance ?? "yüklenmedi"}`,
          pl: `Monety: ${legacyCoinBalance ?? "nie wczytano"}`,
        })}
        onPress={() => {
          hapticTap();
          if (!navOnce('lessons:coin_rank')) return; // зачем (аудит R58 #17, 15.10): двойной тап — один экран ранга
          router.push("/coin_rank");
        }}
        variant="icon"
        // зачем: пилюля `.pill.s` макета (30 dp) — область нажатия добираем до 44 hitSlop'ом.
        hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
        style={{
          // зачем: PressableHybrid по умолчанию alignSelf stretch — в строке высотой 44 (энергия)
          // пилюля липла к верху и стояла на 8 dp выше энергии.
          alignSelf: "center",
          height: 30,
          borderRadius: 15,
          overflow: "hidden",
        }}
        contentStyle={{
          // зачем (эмулятор 30.09): PressableHybrid даёт содержимому width 100% — в строке без
          // ширины пилюля монет растягивалась до 201 dp и выталкивала HUD под заголовок.
          width: "auto",
          height: 30,
          paddingHorizontal: 13,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[learnGlass.opaqueControl, learnGlass.opaqueCard]}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        {/* зачем (сверка learn-002 п.4, kit.css `.pill` + стекло): пилюля монет — блик сверху и светлая кромка, не плоская. */}
        <KitGlassLayer radius={15} />
        {legacyCoinRankSource ? (
          <Image
            testID="legacy-lessons-coin-rank-asset"
            source={legacyCoinRankSource}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
          />
        ) : (
          <View
            testID="legacy-lessons-coin-rank-loading"
            style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: learnGlass.line }}
          />
        )}
        <Text
          testID="legacy-lessons-coin-balance"
          maxFontSizeMultiplier={1.2}
          style={{ color: learnGlass.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] }}
        >
          {legacyCoinBalance === null ? "—" : String(legacyCoinBalance)}
        </Text>
      </PressableHybrid>
      {legacyEnergyReady ? (
        <EnergyBar
          size={24}
          maxWidth={88}
          ownerActive={lessonsRuntimeActive && page === "lessons"}
          compact
          glass
        />
      ) : (
        <View
          testID="legacy-lessons-energy-loading"
          accessibilityLabel={triLang(lang, {
            ru: "Энергия загружается",
            en: "Energy is loading",
            uk: "Енергія завантажується",
            es: "La energía se está cargando",
            "pt-BR": "A energia está carregando",
            vi: "Đang tải năng lượng",
            id: "Energi sedang dimuat",
            tr: "Enerji yükleniyor",
            pl: "Energia jest ładowana",
          })}
          // зачем (владелец 01.10): у энергии нигде нет фона — место держим прозрачным, без капсулы.
          style={{ width: 60, height: 24 }}
        />
      )}
    </View>
  );

  perfR1BodyMark('lessons', 'before_return', perfBodyStart);
  return (
    <>
      {/* зачем (R69, Сверка 15.10): под страницей лежит плотный слой, поэтому своё полотно страницы нужно (без него — плоская ступень в Авроре), но оно обязано совпасть с полотном оболочки: bleedTop поднимает его над верхом страницы на inset вкладки — та же геометрия от верха экрана, шва нет. Отдельным маршрутом bleedTop = 0. */}
      <ScreenGradient forceFullBleed bleedTop={isRetainedTab ? insets.top : 0}>
        {/* зачем (владелец 18.10 «верхняя зона ТОЧНО как на Главной, особо — Уроки»): свой слой bgTop → bg → bgBottom поверх полотна убран —
            под Уроками ровно то же полотно (V2Backdrop), что под Главной, один источник фона на все вкладки. */}
        <View
          style={{
            flex: 1,
            backgroundColor:
              // зачем (владелец 18.10 «верх Уроков ТОЧНО как на Главной»): карта V2 (page "v2") тоже прозрачна — ровный bgPrimary давал ступеньку под часами
              page === "lessons" || page === "dialogs" || page === "v2"
                ? "transparent"
                : t.bgPrimary,
          }}
        >
        {/* Фиксированная шапка (вне скролла): назад + заголовок + энергия.
          Push-экран сам держит верхний safe-area отступ (insets.top ниже). */}
        <View style={{ display: page === "dialogs" ? "flex" : "none" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: headerTopPad,
              paddingBottom: 8,
            }}
          >
            <TapScale
              onPress={handleLessonsBack}
              withHaptic={true}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: t.bgCard,
                borderWidth: 0,
                borderColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
                flexShrink: 0,
              }}
            >
              <BackGlyph size={20} color={t.textPrimary} />
            </TapScale>
            <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
              <Text
                style={{
                  color: screenTitleColor,
                  fontSize: f.numMd,
                  fontWeight: "700",
                }}
              >
                {triLang(lang, {
                  ru: "Обучение",
                  en: "Learn",
                  uk: "Навчання",
                  es: "Aprender",
                  "pt-BR": "Aprender",
                  vi: "Học",
                  id: "Belajar",
                  tr: "Öğren",
                  pl: "Nauka",
                })}
              </Text>
            </View>
            <View
              style={{
                flexShrink: 0,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              {page === "v2" && __DEV__ && ENABLE_DEV_STUDY_TARGET_LANG ? (
                // зачем (владелец, 2026-08-27): dev-кнопка прямо на карточке
                // Learning V2 для быстрого переключения между испанскими и
                // английскими сессиями во время mode-native authoring —
                // раньше язык обучения менялся только в настройках, отдельным
                // экраном. Использует тот же setDevStudyTargetLang +
                // emitDevStudyTargetChanged, что и StudyLanguagePicker —
                // StudyTargetContext подписан на DEV_STUDY_TARGET_CHANGED и
                // обновляет studyTarget во всём дереве мгновенно, без похода
                // в настройки. Только dev-сборка (__DEV__ && ENABLE_DEV_STUDY_TARGET_LANG),
                // в проде не рендерится и не влияет на store-путь.
                //
                // зачем цикл по devStudyTargetsForUiLang(lang), а не по всему
                // DEV_STUDY_TARGET_LANGS (владелец, 2026-08-27, «кнопка не
                // работает, не могу включить испанский»): setDevStudyTargetLang
                // сам молча откатывает es/fr на en, если язык ИНТЕРФЕЙСА
                // приложения сейчас не ru/uk — это законтрактовано тестом
                // study_target_lang_dev.test.ts под StudyLanguagePicker, трогать
                // нельзя. Раньше кнопка гоняла полный список ['en','es','fr'],
                // не зная про это ограничение — на английском интерфейсе она
                // молча писала 'en' поверх 'en' и выглядела сломанной. Теперь
                // кнопка сама ограничивается тем же списком, что видит пикер в
                // настройках, и явно объясняет, если доступен только en.
                <TapScale
                  withHaptic={true}
                  onPress={() => {
                    const options = devStudyTargetsForUiLang(lang);
                    if (options.length <= 1) {
                      Alert.alert(
                        "Dev: язык обучения", // i18n-ok: dev-окно выбора языка обучения, только __DEV__ && ENABLE_DEV_STUDY_TARGET_LANG
                        "Испанский/французский доступны только при русском или украинском языке интерфейса. Смени язык интерфейса в настройках, чтобы переключить сюда.", // i18n-ok: dev-окно выбора языка обучения, только __DEV__ && ENABLE_DEV_STUDY_TARGET_LANG
                      );
                      return;
                    }
                    const currentIndex = options.indexOf(studyTarget as StudyTargetLang);
                    const next = options[(currentIndex + 1) % options.length]!;
                    void (async () => {
                      await setDevStudyTargetLang(next, lang);
                      emitDevStudyTargetChanged();
                      await refreshStudyTarget();
                    })();
                  }}
                >
                  <View
                    accessibilityRole="button"
                    accessibilityLabel="Dev: switch study target language" /* i18n-ok: dev-кнопка смены языка обучения, только __DEV__ */
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: t.bgCard,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Ionicons name="language-outline" size={14} color={t.accentText} />
                    <Text
                      style={{
                        color: t.textPrimary,
                        fontSize: 13,
                        fontWeight: "700",
                        letterSpacing: 0.4,
                      }}
                    >
                      {studyTarget.toUpperCase()}
                    </Text>
                  </View>
                </TapScale>
              ) : null}
              {page === "v2" ? null : <EnergyBar size={30} ownerActive={lessonsRuntimeActive} />}
            </View>
          </View>

          {/* Переключатель страниц: Уроки | Маршрут | Диалоги */}
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              paddingHorizontal: 18,
              borderBottomWidth: 1, // shadow-ok: разделитель-линия под переключателем страниц, не контейнер
              borderBottomColor: t.border,
              marginBottom: 2,
            }}
          >
            <TabUnderlineButton
              label={s.tabs.lessons}
              testID="lessons-tab-lessons"
              active={page === "lessons"}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : accentGraphicOf(t)}
              fontSize={f.body}
              themeMode={themeMode}
              onPress={() => {
                if (page !== "lessons") {
                  hapticTap();
                  setPage("lessons");
                }
              }}
            />
            {dialogsEnabled ? (
              <TabUnderlineButton
                label={triLang(lang, {
                  ru: "Диалоги",
                  en: "Dialogs",
                  uk: "Діалоги",
                  es: "Diálogos",
                  "pt-BR": "Diálogos",
                  vi: "Hội thoại",
                  id: "Dialog",
                  tr: "Diyaloglar",
                  pl: "Dialogi",
                })}
                testID="lessons-tab-dialogs"
                active={page === "dialogs"}
                color={t.textPrimary}
                mutedColor={t.textMuted}
                accent={isGoldTheme ? GOLD_RICH.champagne : accentGraphicOf(t)}
                fontSize={f.body}
                themeMode={themeMode}
                plusBadge={!dialogAccess}
                plusBadgeLabel={triLang(lang, {
                  ru: "Plus",
                  en: "Plus",
                  uk: "Plus",
                  es: "Plus",
                  "pt-BR": "Plus",
                  vi: "Plus",
                  id: "Plus",
                  tr: "Plus",
                  pl: "Plus",
                })}
                onPress={openDialogs}
              />
            ) : null}
            {/* зачем (координатор 23:25, practice-027): в стор-сборке маршруты Learning V2 вырезаны (router.ctx.js) — кнопка «V2»
                вела «карта → занятие → Начать → неизвестный маршрут». Условие ENABLE_DEV_TOOLS сняли в 1d70c8fc5 (19.09),
                а релизный пол 10.10 закрыл только чип «Новые уроки»; кнопка — под той же константой. */}
            {learningV2CanOpen ? (
              <TabUnderlineButton
                label="V2"
                testID="lessons-tab-v2"
                active={page === "v2"}
                color={t.textPrimary}
                mutedColor={t.textMuted}
                accent={isGoldTheme ? GOLD_RICH.champagne : accentGraphicOf(t)}
                fontSize={f.body}
                themeMode={themeMode}
                onPress={() => {
                  if (page !== "v2") {
                    hapticTap();
                    if (__DEV__) {
                      (globalThis as { __v2OpenT0?: number }).__v2OpenT0 = Date.now();
                      console.log("[V2-OPEN] tap", JSON.stringify({ from: "tab_v2" }));
                    }
                    // R08: та же причина, что у «Новых уроков» — страница меняется на следующем кадре, после отпускания нажатой вкладки
                    requestAnimationFrame(() => setPage("v2"));
                  }
                }}
              />
            ) : null}
          </View>
        </View>

        {/* Страница «Диалоги» */}
        {dialogsEnabled && page === "dialogs" ? (
          <View style={{ flex: 1 }}>
            <DialogsTabContent
              bottomPadding={listBottomPad}
              onScroll={(e) => {
                topFadeScroll?.onScroll?.(e);
              }}
              active={lessonsRuntimeActive && page === "dialogs"}
            />
          </View>
        ) : null}

        {/* Страница «Уроки» (держим смонтированной, прячем при показе диалогов) */}
        <View
          style={{
            flex: 1,
            display: dialogsEnabled && page === "dialogs" ? "none" : "flex",
          }}
          onTouchStart={() => { lastLessonsTouchAtRef.current = Date.now(); }}
          // зачем (координатор 15.10, R08 🔴 [V2-MAP-LAYOUT]): контейнер страницы — высота 0 здесь = карте некуда выложиться; display/страница/прогрев прогресса — что решило
          onLayout={(e) => { const { width, height } = e.nativeEvent.layout; console.log("[V2-MAP-LAYOUT] onLayout", JSON.stringify({ level: "lessonsPage", width: Math.round(width), height: Math.round(height), zero: width === 0 || height === 0, page, display: dialogsEnabled && page === "dialogs" ? "none" : "flex", progressHydrated: learningV2ProgressHydrated, completed: learningV2Progress.completedSessionIds.length, visible: lessonsTabVisible, atMs: Date.now() })); }} // guard-ok: зонд R08
        >
          {page === "v2" ? (
            // зачем: владелец 20.09 — «открываем раздел, запускается анимация
            // которая была прописана при входе, это всё, никаких морганий».
            // Здесь стояло условие revealCourse (гейт «Пропуска основателя», удалён 17.10), а
            // в ветке else — пустая заглушка. Пока чек о показе модала читался
            // с диска, человек видел пустой экран; когда чек приходил, карта
            // монтировалась ЗАНОВО и вступление играло второй раз. Карта
            // теперь рисуется сразу и живёт, пока раздел открыт; модал лежит
            // поверх неё.
            <LearningV2ChaptersCourse
              // зачем: здесь стоял key={learningV2ProjectionScopeKey}. Ключ
              // собирается из captureAccountGeneration().generation, который
              // читается ВНЕ зависимостей useMemo: при пересчёте мемо ключ
              // получал новое значение, React уничтожал карту и строил заново
              // — экран гас и открывался второй раз (владелец 20.09: «с
              // потушением экрана, а затем снова, как будто два раза»).
              // Ключ не нужен: смена аккаунта и так меняет scopeKey, который
              // передаётся пропом и пересобирает проекцию внутри компонента.
              scopeKey={learningV2ProjectionScopeKey}
              topPadding={headerTopPad}
              headerAccessory={learningV2ResourceHud}
              coinTargetRef={learningV2CoinTargetRef}
              navigationControl={
                <PressableHybrid
                  testID="learning-v2-back-home"
                  accessibilityLabel={triLang(lang, { ru: "Назад", en: "Back", uk: "Назад", es: "Atrás", "pt-BR": "Voltar", vi: "Quay lại", id: "Kembali", tr: "Geri", pl: "Wstecz" })}
                  onPress={handleLessonsBack}
                  variant="icon"
                  style={{ width: 44, height: 44 }}
                  contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  <BackGlyph size={23} color={t.textPrimary} />
                </PressableHybrid>
              }
              titles={lessons}
              lang={lang}
              legacyLessonsLabel={classicCourseLabel}
              onLegacyLessons={requestLegacyLessons}
              preparedProgress={learningV2PreparedProgress}
              currentSessionId={learningV2Progress.currentSessionId}
              preferredLessonOrdinal={learningV2LastLesson ?? null}
              completedSessionIds={learningV2Progress.completedSessionIds}
              stars={learningV2StarResults}
              active={lessonsRuntimeActive}
              reducedMotion={learningV2ReduceMotionPreference !== false}
              devUnlockAll={learningV2DevUnlockAllActive}
              isSessionMaterialAvailable={isLearningV2SessionMaterialAvailable}
              bottomPadding={listBottomPad}
              onExpandedLesson={handleLearningV2ExpandedLesson}
              onVisibleSessionsSettled={handleLearningV2VisibleSessionsSettled}
              onUnavailableLessonPress={() => showLearningV2DenialHint(triLang(lang, {
                ru: "Урок ещё в работе",
                en: "This lesson is still in progress",
                uk: "Урок ще в роботі",
                es: "Esta lección todavía está en preparación",
                "pt-BR": "Esta lição ainda está em preparação",
                vi: "Bài học này vẫn đang được hoàn thiện",
                id: "Pelajaran ini masih dalam pengerjaan",
                tr: "Bu ders hâlâ hazırlanıyor",
                pl: "Ta lekcja jest jeszcze przygotowywana",
              }))}
              onLockedLessonPress={(lessonOrdinal) => showLearningV2DenialHint(triLang(lang, {
                // зачем (владелец 2026-09-20): та же болезнь, что и в модалке
                // замка — русский говорил «Ещё рано» и НЕ называл требование,
                // хотя остальные 8 языков честно называют номер урока.
                ru: `Пройди урок ${lessonOrdinal - 1}, чтобы открыть этот`,
                en: `Complete lesson ${lessonOrdinal - 1} to unlock`,
                uk: `Пройди урок ${lessonOrdinal - 1}, щоб відкрити`,
                es: `Completa la lección ${lessonOrdinal - 1} para desbloquear`,
                "pt-BR": `Conclua a lição ${lessonOrdinal - 1} para desbloquear`,
                vi: `Hoàn thành bài ${lessonOrdinal - 1} để mở khóa`,
                id: `Selesaikan pelajaran ${lessonOrdinal - 1} untuk membuka`,
                tr: `Kilidi açmak için ${lessonOrdinal - 1}. dersi tamamla`,
                pl: `Ukończ lekcję ${lessonOrdinal - 1}, aby odblokować`,
              }))}
              renderLessonCard={({ title, ordinal, completedSessionCount, isCurrent, isAvailable, isInProgress, onPress }) => renderLessonCard({
                index: ordinal - 1,
                name: title,
                learningV2ProgressCount: completedSessionCount,
                learningV2IsCurrent: isCurrent,
                learningV2Available: isAvailable,
                learningV2InProgress: isInProgress,
                onLearningV2PressOverride: onPress,
              })}
              onSessionPress={handleLearningV2SessionPress}
            />
          ) : (
          <View
            testID="legacy-lessons-catalog"
            style={{ flex: 1, backgroundColor: "transparent" }}
          >
            {/* зачем (владелец 2026-09-30, learn.html A1): шапка «Обучение» 40/46 в одну строку.
                Раньше заголовок стоял с flex: 1 между кнопкой «назад» и плашками монет/энергии
                и на узком экране ломался по буквам («Обу / чен / ие»). Теперь заголовок не
                сжимается, а монета и энергия при нехватке места переносятся под него (flexWrap).
                Вкладка корневая — «назад» только когда экран открыт поверх (push). */}
            <View
              style={{
                paddingTop: headerTopPad,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  minHeight: 46,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  columnGap: 10,
                  rowGap: 8,
                }}
              >
                {/* зачем (владелец 17.10): в корневой вкладке старый список открыт кнопкой с карты — стрелка возвращает на новые уроки */}
                {!isRetainedTab || learningV2CanOpen ? (
                  <PressableHybrid
                    testID="legacy-lessons-back-home"
                    accessibilityLabel={triLang(lang, {
                      ru: "Назад",
                      en: "Back",
                      uk: "Назад",
                      es: "Atrás",
                      "pt-BR": "Voltar",
                      vi: "Quay lại",
                      id: "Kembali",
                      tr: "Geri",
                      pl: "Wstecz",
                    })}
                    onPress={handleLessonsBack}
                    variant="icon"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: learnGlass.buttonFill,
                      boxShadow: nestedBoxShadow(learnGlass), // зачем («Тень» 12.10): круглая кнопка без кромки, с малой тенью
                    }}
                    contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <BackGlyph
                      size={22}
                      color={learnGlass.text}
                    />
                  </PressableHybrid>
                ) : null}
                <Text
                  testID="legacy-lessons-title"
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.3}
                  style={{
                    flexShrink: 0,
                    maxWidth: "100%",
                    color: learnGlass.text,
                    fontSize: 34,
                    lineHeight: 40,
                    fontWeight: "700",
                    letterSpacing: -0.6,
                  }}
                >
                  {legacyLessonsScreenTitle}
                </Text>
                <View style={{ marginLeft: "auto" }}>{legacyLessonsResourceHud}</View>
              </View>
            </View>

            {/* зачем (владелец 04.10, раунд 2 → «Обучение B»): одна строка 40px — поле поиска на всю ширину + «Смешать темы»
                и «Новые уроки» справа; поиск больше не прячется за кнопкой и не открывает отдельную панель. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 20,
                marginTop: 12,
              }}
            >
              <View
                testID="legacy-lessons-search-toggle"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 40,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 14,
                  paddingRight: legacyLessonQuery ? 0 : 14,
                  backgroundColor: learnGlass.plateFillFrom,
                  boxShadow: plateBoxShadow(learnGlass), // зачем («Тень» 12.10): поле поиска — плашка без кромки
                }}
              >
                <Ionicons name="search" size={18} color={learnGlass.secondary} />
                <TextInput
                  testID="legacy-lessons-search-input"
                  value={legacyLessonQuery}
                  onChangeText={setLegacyLessonQuery}
                  returnKeyType="search"
                  accessibilityLabel={triLang(lang, {
                    ru: "Поиск по урокам", uk: "Пошук за уроками", en: "Search lessons",
                    es: "Buscar lecciones", "pt-BR": "Buscar lições", vi: "Tìm bài học",
                    id: "Cari pelajaran", tr: "Derslerde ara", pl: "Szukaj lekcji",
                  })}
                  placeholder={triLang(lang, {
                    ru: "Урок или тема", uk: "Урок або тема", en: "Lesson or topic",
                    es: "Lección o tema", "pt-BR": "Lição ou tema", vi: "Bài học hoặc chủ đề",
                    id: "Pelajaran atau topik", tr: "Ders veya konu", pl: "Lekcja lub temat",
                  })}
                  placeholderTextColor={learnGlass.secondary}
                  selectionColor={learnGlass.text}
                  style={{ flex: 1, minWidth: 0, color: learnGlass.text, fontSize: 16, padding: 0 }}
                />
                {legacyLessonQuery ? (
                  <TouchableOpacity
                    testID="legacy-lessons-search-close"
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, {
                      ru: "Очистить поиск", uk: "Очистити пошук", en: "Clear search",
                      es: "Borrar búsqueda", "pt-BR": "Limpar busca", vi: "Xóa tìm kiếm",
                      id: "Hapus pencarian", tr: "Aramayı temizle", pl: "Wyczyść wyszukiwanie",
                    })}
                    onPress={() => {
                      hapticTap();
                      setLegacyLessonQuery("");
                    }}
                    hitSlop={6}
                    style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="close" size={18} color={learnGlass.secondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Ряд листается, только если кнопкам тесно (крупный шрифт/узкий экран);
                  затухание справа появляется лишь тогда — иначе оно ложилось бы полосой
                  на фон темы. */}
              <View style={{ flexShrink: 0 }}>
                <ScrollView
                  horizontal
                  testID="legacy-lessons-level-rail"
                  showsHorizontalScrollIndicator={false}
                  // зачем: рельса обязана иметь свою высоту ДО замера контента —
                  // иначе первый кадр прыгает (правило стабильности раскладки).
                  // зачем (владелец 13.10, скрин «Обучение»: «обрезаны иконки внизу — комбо и новые v2»): горизонтальный ScrollView на Android
                  // режет всё, что выходит за его высоту, — низ круга 40×40 и его тень (nestedBoxShadow). Вертикальный запас внутри контента
                  // (paddingVertical 8) + такой же отрицательный margin на самом ScrollView: видимая область шире, а место в раскладке прежнее.
                  style={{ flexGrow: 0, marginVertical: -8 }}
                  onLayout={(e) => setLegacyRailWidth(e.nativeEvent.layout.width)}
                  onContentSizeChange={(w) => setLegacyRailContentWidth(w)}
                  contentContainerStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingRight: 18,
                    paddingVertical: 8,
                  }} decelerationRate="fast"
                >
                  {/* зачем (владелец 2026-09-17): «комбинированный урок» — несколько тем
                      вперемешку. В макете 2.0 это круглая кнопка «Смешать темы» рядом с
                      лупой. alignSelf не задаём: выравнивает контейнер прокрутки. */}
                  <PressableHybrid
                    testID="legacy-lessons-level-combo"
                    accessibilityRole="button"
                    accessibilityLabel={triLang(lang, {
                      ru: "Комбинированный урок: несколько тем вперемешку",
                      en: "Combined lesson: several topics mixed",
                      uk: "Комбінований урок: кілька тем упереміш",
                      es: "Lección combinada: varios temas mezclados",
                      "pt-BR": "Lição combinada: vários temas misturados",
                      vi: "Bài học kết hợp: nhiều chủ đề trộn lẫn",
                      id: "Pelajaran gabungan: beberapa topik campur",
                      tr: "Birleşik ders: birkaç konu karışık",
                      pl: "Lekcja łączona: kilka tematów naprzemiennie",
                    })}
                    onPress={openCombinedLesson}
                    variant="chip"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: learnGlass.buttonFill,
                      boxShadow: nestedBoxShadow(learnGlass),
                    }}
                    contentStyle={{
                      height: 40,
                      paddingHorizontal: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    {/* зачем (сверка learn-002 п.5, kit.css `.rb` + стекло): круг — блик сверху и светлая кромка. */}
                    <KitGlassLayer radius={20} />
                    <Ionicons name="shuffle" size={20} color={learnGlass.text} />
                  </PressableHybrid>
                  {/* зачем (learn.html, spec_learn «Удалено в 2.0»): чип «Новые уроки» в шапке
                      списка снят. Пока курс нельзя открыть вручную (релиз), кнопки нет вовсе —
                      раньше она лишь отвечала «курс в разработке». В дев-сборке вход остаётся. */}
                  {/* зачем (владелец 17.10): в корневой вкладке чип «Новые уроки» не нужен — карта открывается сама, возврат на неё — стрелка слева в заголовке; в push-маршруте старого списка он остаётся */}
                  {!isRetainedTab && learningV2CanOpen ? (
                    <PressableHybrid
                      testID="legacy-lessons-open-new-lessons"
                      accessibilityLabel={triLang(lang, {
                        ru: "Новые уроки",
                        en: "New lessons",
                        uk: "Нові уроки",
                        es: "Lecciones nuevas",
                        "pt-BR": "Lições novas",
                        vi: "Bài học mới",
                        id: "Pelajaran baru",
                        tr: "Yeni dersler",
                        pl: "Nowe lekcje",
                      })}
                      accessibilityState={{
                        disabled: !learningV2CanOpen,
                      }}
                      onPress={openNewLessons}
                      variant="chip"
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: learnGlass.buttonFill,
                        boxShadow: nestedBoxShadow(learnGlass),
                        opacity: learningV2CanOpen ? 1 : 0.45,
                      }}
                      contentStyle={{
                        height: 40,
                        paddingHorizontal: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 20,
                        overflow: "hidden",
                      }}
                    >
                      <KitGlassLayer radius={20} />
                      <Ionicons name="sparkles" size={20} color={learnGlass.text} />
                    </PressableHybrid>
                  ) : null}
                </ScrollView>
                {legacyRailOverflows ? (
                  <LinearGradient
                    pointerEvents="none"
                    colors={[lessonsGlassAlpha(learnGlass.bgTop, 0), learnGlass.bgTop]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 20,
                    }}
                  />
                ) : null}
              </View>
            </View>


            {/* зачем: ответ недоступной кнопки «Новые уроки» (только дев-сборка, см. выше). */}
            {learningV2LockedNoticeVisible ? (
              <Text
                testID="legacy-lessons-new-lessons-locked-notice"
                accessibilityLiveRegion="polite"
                style={{
                  paddingHorizontal: 20,
                  marginTop: 10,
                  color: learnGlass.secondary,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: "700",
                  textAlign: "right",
                }}
              >
                {triLang(lang, {
                  ru: "Этот курс находится в разработке",
                  en: "This course is still in development",
                  uk: "Цей курс перебуває в розробці",
                  es: "Este curso está en desarrollo",
                  "pt-BR": "Este curso está em desenvolvimento",
                  vi: "Khóa học này đang được phát triển",
                  id: "Kursus ini masih dalam pengembangan",
                  tr: "Bu kurs hâlâ geliştiriliyor",
                  pl: "Ten kurs jest w trakcie tworzenia",
                })}
              </Text>
            ) : null}

          <BouncyWrap style={bouncyStyle}>
            <Animated.FlatList
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleLessonsScroll}
              onScrollEndDrag={handleLessonsScrollEnd}
              onMomentumScrollEnd={handleLessonsScrollEnd}
              contentContainerStyle={{ paddingTop: 2, paddingBottom: listBottomPad }}
              decelerationRate="fast"
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              data={legacyFilteredListData}
              // зачем: поиск без результата не должен давать белый экран —
              // объясняем, что искали, и подсказываем сузить запрос.
              // Показываем ТОЛЬКО при активном запросе: пустой список без
              // поиска здесь невозможен (уровни всегда что-то содержат).
              ListEmptyComponent={
                legacyLessonQuery.trim() ? (
                  <View style={{ paddingHorizontal: 30, paddingTop: 60, alignItems: "center" }}>
                    {/* зачем (Сверка learn-004, learn.html .empty .tt): заголовок 18/700 (было 16). */}
                    <Text style={{ color: learnGlass.text, fontSize: 16, lineHeight: 24, fontWeight: "700", textAlign: "center" }}>
                      {triLang(lang, {
                        ru: "Ничего не нашлось", uk: "Нічого не знайшлося", en: "Nothing found",
                        es: "No se encontró nada", "pt-BR": "Nada encontrado", vi: "Không tìm thấy gì",
                        id: "Tidak ada yang cocok", tr: "Bir şey bulunamadı", pl: "Nic nie znaleziono",
                      })}
                    </Text>
                    <Text style={{ color: learnGlass.secondary, fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: "center" }}>
                      {triLang(lang, {
                        ru: "Попробуй короче — например «прош» вместо целой фразы.",
                        uk: "Спробуй коротше — наприклад «мин» замість цілого вислову.",
                        en: "Try something shorter — for example “past” instead of a whole phrase.",
                        es: "Prueba algo más corto, por ejemplo «pas» en vez de la frase entera.",
                        "pt-BR": "Tente algo mais curto — por exemplo “pass” em vez da frase toda.",
                        vi: "Hãy thử ngắn hơn — ví dụ “quá” thay vì cả cụm.",
                        id: "Coba lebih pendek — misalnya “lam” alih-alih seluruh frasa.",
                        tr: "Daha kısa dene — örneğin tüm cümle yerine “geç”.",
                        pl: "Spróbuj krócej — na przykład „prze” zamiast całej frazy.",
                      })}
                    </Text>
                  </View>
                ) : null
              }
              keyExtractor={(item, index) =>
                item.kind === "lesson"
                  ? `l-${item.index + 1}`
                  : item.kind === "v2_chapter" || item.kind === "v2_session"
                    ? item.row.id
                  : item.kind === "header"
                    ? `h-${item.label}-${index}`
                    : item.kind === "exam"
                      ? `e-${item.level}`
                      : "attestation"
              }
              // зачем (бета-тест Б3, 15.10; [PERF-R1] lessons mount actualMs 318 при 12 стартовых строках): на экране помещается ~6–7 строк, остальное доезжает следующим батчем (maxToRenderPerBatch) — первый кадр строит 8, а не 12
              initialNumToRender={8}
              windowSize={7}
              maxToRenderPerBatch={8}
              // зачем: scrollToIndex на длинном списке бьётся, если целевая
              // строка ещё не смерена. Без этого обработчика RN роняет экран
              // ошибкой. Подтягиваем список ближе и повторяем один раз.
              onScrollToIndexFailed={(info) => {
                if (__DEV__) {
                  console.log(
                    "[V2-MAP] scrollToIndex:failed",
                    JSON.stringify({
                      index: info.index,
                      highestMeasured: info.highestMeasuredFrameIndex,
                      averageItemLength: Math.round(info.averageItemLength),
                    }),
                  );
                }
                scrollRef.current?.scrollToOffset?.({
                  offset: info.averageItemLength * info.index,
                  animated: false,
                });
              }}
              // зачем: раздел «Уроки» открывался ПУСТЫМ. Список живёт внутри
              // BouncyWrap — Animated.View с постоянным translateY. При
              // removeClippedSubviews RN меряет видимую область по родителю со
              // сдвигом, считает все строки «за экраном» и вырезает их: шапка
              // есть, уроков нет, и они появляются только когда скролл сдвинет
              // окно. Это единственное место в проекте, где обрезка стояла
              // безусловно (везде — false или только Android). Экономия здесь
              // мнимая: окно держит windowSize.
              // ВАЖНО (20.09): в разделе V2 список больше не 36 строк —
              // карта сплошная, 32 плашки + 224 главы + 1792 занятия = 2048
              // строк. Виртуализация FlatList (windowSize 7) это держит:
              // в памяти живёт ~7 экранов, а не весь курс. Не заменять
              // FlatList на ScrollView/map — это положит раздел.
              // зачем (PM-040, владелец 2026-09-24): заглушка «· · · / Продолжение
              // скоро» под списком уроков убрана — она обещала контент,
              // которого нет, и повторяла отменённое правило (список уроков
              // теперь либо полный, либо честно ограничен доступом, а не
              // «скоро продолжится»). Кнопка жалобы на список уроков остаётся.
              ListFooterComponent={
                // зачем (сверка learn-004, learn.html A4): при пустом результате поиска в макете под
                // «Ничего не нашлось» только совет — жалобу на список уроков тут не показываем.
                legacyFilteredListData.length === 0 && legacyLessonQuery.trim() ? null : (
                <>
                  <View style={{ alignItems: "center", paddingVertical: 20 }}>
                    <ReportErrorButton
                      screen="lessons_tab"
                      dataId="lessons_list"
                      dataText={triLang(lang, {
                        ru: "Список уроков",
                        en: "Lesson list",
                        uk: "Список уроків",
                        es: "Lista de lecciones",
                        "pt-BR": "Lista de lições",
                        vi: "Danh sách bài học",
                        id: "Daftar pelajaran",
                        tr: "Ders listesi",
                        pl: "Lista lekcji",
                      })}
                    />
                  </View>
                </>
                )
              }
              renderItem={({ item, index: i }) => {
                const scaleAnim = itemAnims[i];
                if (
                  item.kind === "v2_chapter" ||
                  item.kind === "v2_session"
                ) {
                  return (
                    <LearningV2InlineMapRow
                      row={item.row}
                      lang={lang}
                      theme={t}
                      fonts={f}
                      reduceMotion={learningV2ReduceMotionPreference !== false}
                      runtimeActive={lessonsRuntimeActive}
                      devUnlockAll={learningV2DevUnlockAllActive}
                      isPremium={isPremium}
                      earnedStars={
                        item.kind === "v2_session"
                          ? learningV2StarResults[
                              learningV2CourseSessionIdV1(
                                item.row.lessonOrdinal,
                                item.row.sessionOrdinal,
                              )
                            ]
                          : undefined
                      }
                      onSessionPress={handleLearningV2SessionPress}
                    />
                  );
                }
                if (item.kind === "attestation") {
                  // зачем: `.attest` из learn.html A9 — стеклянная карточка вместо цветной
                  // плашки с полосой-акцентом; маршрут прежний.
                  return (
                    <LessonsListGlassAttestationCard
                      key="attestation-after-32"
                      glass={learnGlass}
                      title={s.home.attestTile}
                      onPress={openDiagnosticTest}
                    />
                  );
                }
                if (item.kind === "header") {
                  const premiumLocked =
                    !isPremium &&
                    !effectiveDevContentUnlock &&
                    !effectiveNoLimits &&
                    item.label !== "A1";
                  // зачем: `.lvh` макета — «A1» кеглем 22 и счётчик «1 из 8» (пройденные уроки
                  // уровня по тем же progCounts, что и карточки). В поиске счётчика нет (A3).
                  // зачем (learn-3): замок у заголовка уровня — по макету только у Free; печатаем, что его решило.
                  logOncePerKey('[LESSONS-HEADER] lock', `${item.label}|${premiumLocked}`, {
                    label: item.label, locked: premiumLocked, isPremium, devMode: effectiveDevContentUnlock, noLimits: effectiveNoLimits,
                  });
                  const [levelFrom, levelTo] = COURSE_LEVEL_RANGES[item.label];
                  const levelDone = progCounts
                    .slice(levelFrom - 1, levelTo)
                    .filter((count) => (count ?? 0) >= 50).length;
                  return (
                    <LessonsListLevelHeader
                      glass={learnGlass}
                      lang={lang}
                      label={item.label}
                      locked={premiumLocked}
                      countText={
                        legacyLessonQuery.trim()
                          ? null
                          : lessonsListCopy.countOf(lang, levelDone, levelTo - levelFrom + 1)
                      }
                      first={i === 0}
                    />
                  );
                }
                if (item.kind === "exam")
                  return renderExamCard(item.level) as React.ReactElement;
                if (item.kind === "lesson") {
                  return renderLessonCard(item) as React.ReactElement;
                }
                return null;
                /* Legacy accordion renderer retained below only until the next general cleanup.
               It is unreachable: every item in the flat list returns above.
            // ── Глава-аккордеон ──────────────────────────────────────────────
            const { level: chapterLevel, from: chapFrom, to: chapTo } = item;
            const chapterAccent = isGoldTheme ? goldCefrAccent(chapterLevel).accent : accentTextSafeOf(t);
            const chapterPremiumLocked = !isPremium && !effectiveDevContentUnlock && !effectiveNoLimits && chapterLevel !== 'A1';
            const chapterCounts = progCounts.slice(chapFrom - 1, chapTo);
            const chapterDone = chapterCounts.filter((count) => (count ?? 0) >= 50).length;
            const chapterPct = chapterCounts.length > 0 ? chapterDone / chapterCounts.length : 0;
            const chapterIndex = (Object.keys(COURSE_LEVEL_RANGES) as CourseLevel[]).indexOf(chapterLevel);
            return (<View key={`chap-${chapterLevel}`} style={{ marginTop: chapterIndex === 0 ? 6 : 10 }}>
              <ChapterCard
                title={triLang(lang, {
                    ru: `Глава ${chapterLevel}`,
                    en: `Chapter ${chapterLevel}`,
                    uk: `Глава ${chapterLevel}`,
                    es: `Capítulo ${chapterLevel}`,
                    'pt-BR': `Capítulo ${chapterLevel}`,
                    vi: `Chương ${chapterLevel}`,
                    id: `Bab ${chapterLevel}`,
                    tr: `Bölüm ${chapterLevel}`,
                    pl: `Rozdział ${chapterLevel}`,
                })}
                statusLine={chapterStatusLine(chapFrom, chapTo, chapterDone, lang)}
                pct={chapterPct}
                lockedPlus={chapterPremiumLocked}
                expanded={openChapters.has(chapterLevel)}
                onToggle={chapterToggles[chapterLevel]}
                accent={chapterAccent}
                isGoldTheme={isGoldTheme}
                t={t}
                f={f}
                themeMode={themeMode}
                delayMs={60 + Math.max(0, chapterIndex) * 50}
              >
                {chapterBodies[chapterLevel]}
              </ChapterCard>
            </View>);
            */
              }}
            />
            {/* зачем (learn-007, находка Тем 13.10): список листается под полем поиска — верхний край был жёстким срезом впритык к полю; мягкое растворение 16 px появляется только после прокрутки. */}
            {topFadeScroll ? <ListTopEdgeFade g={learnGlass} scrollY={topFadeScroll.scrollY} /> : null}
          </BouncyWrap>
          </View>
          )}
          {learningV2DenialHint !== null ? (
            <Reanimated.View
              pointerEvents="none"
              accessibilityLiveRegion="polite"
              style={[
                {
                  position: "absolute",
                  left: 24,
                  right: 24,
                  // зачем (Ревизор 15.10, R03): было жёсткое 130 — подсказка наезжала на капсулу таб-бара; теперь от общего источника «верх капсулы + дыхание»
                  // зачем (аудит R58 #20, 15.10): в push-режиме (без таб-бара) отступ таб-бара поднимал подсказку на пустом месте — берём тот же отступ, что у списка (таб-бар или нижняя безопасная зона).
                  bottom: listBottomPad,
                  alignItems: "center",
                },
                learningV2DenialHintStyle,
              ]}
            >
              {/* зачем (learning-v2.html, `.hint`): тост «Урок ещё в работе» / «Пройди урок N» —
                  плита стекла радиусом 18 с кромкой 1 px, текст 15/600; логика показа прежняя. */}
              <View
                style={{
                  backgroundColor: learnGlass.opaqueControl,
                  borderRadius: 18,
                  boxShadow: plateBoxShadow(learnGlass), // зачем («Тень» 12.10): тост-плашка без кромки, с тенью плашки
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  ...noAndroidOutline, // зачем: Android рисует квадрат вокруг скруглённой плашки без непрозрачного фона (сторож android_no_square_outline)
                }}
              >
                <Text
                  style={{
                    color: learnGlass.text,
                    fontSize: 16,
                    lineHeight: 21,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {learningV2DenialHint}
                </Text>
              </View>
            </Reanimated.View>
          ) : null}
        </View>
        </View>
      </ScreenGradient>
      <FeatureIntroModal
        visible={legacyLessonsIntro.visible}
        icon={legacyLessonsIntroDef.icon}
        introId={legacyLessonsIntroDef.id}
        family={legacyLessonsIntroDef.family}
        art={legacyLessonsIntroDef.art}
        title={legacyLessonsIntroDef.title(lang)}
        body={legacyLessonsIntroDef.body(lang)}
        ctaLabel={legacyLessonsIntroDef.ctaLabel(lang)}
        laterLabel={featureIntroLater(lang)}
        secondaryLabel={triLang(lang, {
          ru: "Остаться в новых уроках",
          en: "Stay in new lessons",
          uk: "Залишитися в нових уроках",
          es: "Seguir en las lecciones nuevas",
          "pt-BR": "Ficar nas lições novas",
          vi: "Ở lại bài học mới",
          id: "Tetap di pelajaran baru",
          tr: "Yeni derslerde kal",
          pl: "Zostań w nowych lekcjach",
        })}
        onDone={legacyLessonsIntro.finish}
        onLater={legacyLessonsIntro.cancel}
        testIdPrefix="legacy-lessons-first-visit"
      />
      <LearningV2SessionOutcomeSheet
        lessonOrdinal={selectedLearningV2Session?.lessonOrdinal ?? 1}
        sessionOrdinal={selectedLearningV2Session?.sessionOrdinal ?? 1}
        visible={selectedLearningV2Session !== null}
        onMounted={handleLearningV2SessionModalMounted}
        title={learningV2SessionOutcomeTitle(
          selectedLearningV2OutcomeKind,
          lang,
        )}
        message={selectedLearningV2Outcome}
        primaryLabel={
          // зачем (learning-v2.html 2.3, координатор 05.10): у проверки главы (каждое 8-е занятие) кнопка
          // «Начать проверку» — отдельная строка, общий «Начать» других экранов не трогаем.
          selectedLearningV2Session?.state !== "completed"
            && (selectedLearningV2Session?.sessionOrdinal ?? 1) % 8 === 0
            ? triLang(lang, {
                ru: "Начать проверку",
                en: "Start the check",
                uk: "Почати перевірку",
                es: "Empezar la prueba",
                "pt-BR": "Começar o teste",
                vi: "Bắt đầu kiểm tra",
                id: "Mulai tes",
                tr: "Teste başla",
                pl: "Rozpocznij test",
              })
            : selectedLearningV2Session?.state === "completed"
            ? triLang(lang, {
                ru: "Повторить",
                en: "Retry",
                uk: "Повторити",
                es: "Repetir",
                "pt-BR": "Repetir",
                vi: "Luyện lại",
                id: "Ulangi",
                tr: "Tekrarla",
                pl: "Powtórz",
              })
            : triLang(lang, {
                ru: "Начать",
                en: "Start",
                uk: "Почати",
                es: "Empezar",
                "pt-BR": "Começar",
                vi: "Bắt đầu",
                id: "Mulai",
                tr: "Başla",
                pl: "Zacznij",
              })
        }
        // зачем (learning-v2.html 2.2, Ядро 91a523b5a): лучшие звёзды пройденного занятия — из той же витрины, что
        // рисует звёзды на узлах карты (состояние подписано, окно перерисуется при записи). Нет значения — строки нет.
        bestStars={
          selectedLearningV2Session?.state === "completed"
            ? learningV2StarResults[
                learningV2CourseSessionIdV1(
                  selectedLearningV2Session.lessonOrdinal,
                  selectedLearningV2Session.sessionOrdinal,
                )
              ]
            : undefined
        }
        bestStarsLabel={triLang(lang, {
          ru: "Лучший результат",
          en: "Best result",
          uk: "Найкращий результат",
          es: "Mejor resultado",
          "pt-BR": "Melhor resultado",
          vi: "Kết quả tốt nhất",
          id: "Hasil terbaik",
          tr: "En iyi sonuç",
          pl: "Najlepszy wynik",
        })}
        onPrimaryPress={() => launchSelectedLearningV2Session(false)}
        // зачем (learning-v2.html startModal 2.2/2.3: `sec: null`): у пройденного занятия и у проверки главы
        // второй кнопки «Сразу к практике» нет — в макете на её месте только отступ.
        secondaryLabel={selectedLearningV2Session?.state === "completed"
          || (selectedLearningV2Session?.sessionOrdinal ?? 1) % 8 === 0 ? null : triLang(lang, {
          ru: "Сразу к практике",
          en: "Go straight to practice",
          uk: "Одразу до практики",
          es: "Ir directo a la práctica",
          "pt-BR": "Ir direto para a prática",
          vi: "Vào thẳng phần luyện tập",
          id: "Langsung ke latihan",
          tr: "Doğrudan alıştırmaya geç",
          pl: "Od razu do ćwiczeń",
        })}
        closeLabel={triLang(lang, {
          ru: "Закрыть",
          uk: "Закрити",
          en: "Close",
          es: "Cerrar",
          "pt-BR": "Fechar",
          vi: "Đóng",
          id: "Tutup",
          tr: "Kapat",
          pl: "Zamknij",
        })}
        onSecondaryPress={() => launchSelectedLearningV2Session(true)}
        sessionLabel={triLang(lang, { ru: "Сессия", en: "Session", uk: "Сесія", es: "Sesión", "pt-BR": "Sessão", vi: "Buổi", id: "Sesi", tr: "Oturum", pl: "Sesja" })}
        chapterLabel={triLang(lang, { ru: "Глава", en: "Chapter", uk: "Розділ", es: "Capítulo", "pt-BR": "Capítulo", vi: "Chương", id: "Bab", tr: "Bölüm", pl: "Rozdział" })}
        durationLabel={triLang(lang, { ru: "≈ 5 минут", en: "≈ 5 minutes", uk: "≈ 5 хвилин", es: "≈ 5 minutos", "pt-BR": "≈ 5 minutos", vi: "≈ 5 phút", id: "≈ 5 menit", tr: "≈ 5 dakika", pl: "≈ 5 minut" })}
        wordsLabel={learningV2NewWordCountLabel(selectedLearningV2NewWordCount, lang)}
        attemptsLabel={triLang(lang, { ru: "3 попытки", en: "3 attempts", uk: "3 спроби", es: "3 intentos", "pt-BR": "3 tentativas", vi: "3 lượt thử", id: "3 percobaan", tr: "3 deneme", pl: "3 próby" })}
        onClose={() => {
          learningV2ModalRequestRef.current += 1;
          setSelectedLearningV2Session(null);
        }}
      />
      {/* зачем (learning-v2-013, learning-v2.html 2.4 modal-locked): «Занятие N» · «Сначала заверши предыдущее занятие.» ·
          одна кнопка «Закрыть», без второй кнопки и без фактов, тусклый шар с замком. */}
      <LearningV2SessionOutcomeSheet
        visible={learningV2LockedSession !== null}
        lessonOrdinal={learningV2LockedSession?.lessonOrdinal ?? 1}
        sessionOrdinal={learningV2LockedSession?.sessionOrdinal ?? 1}
        locked
        title={triLang(lang, {
          ru: `Занятие ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          en: `Session ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          uk: `Заняття ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          es: `Sesión ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          "pt-BR": `Sessão ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          vi: `Buổi ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          id: `Sesi ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          tr: `Oturum ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
          pl: `Sesja ${learningV2LockedSession?.sessionOrdinal ?? 1}`,
        })}
        message={triLang(lang, {
          ru: "Сначала заверши предыдущее занятие.",
          en: "Finish the previous session first.",
          uk: "Спершу заверши попереднє заняття.",
          es: "Primero termina la sesión anterior.",
          "pt-BR": "Primeiro conclua a sessão anterior.",
          vi: "Hãy hoàn thành buổi trước trước.",
          id: "Selesaikan sesi sebelumnya dulu.",
          tr: "Önce önceki oturumu bitir.",
          pl: "Najpierw ukończ poprzednią sesję.",
        })}
        primaryLabel={triLang(lang, { ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar", vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij" })}
        onPrimaryPress={() => setLearningV2LockedSession(null)}
        secondaryLabel={null}
        onSecondaryPress={() => setLearningV2LockedSession(null)}
        closeLabel={triLang(lang, { ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar", vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij" })}
        sessionLabel={triLang(lang, { ru: "Сессия", en: "Session", uk: "Сесія", es: "Sesión", "pt-BR": "Sessão", vi: "Buổi", id: "Sesi", tr: "Oturum", pl: "Sesja" })}
        chapterLabel={triLang(lang, { ru: "Глава", en: "Chapter", uk: "Розділ", es: "Capítulo", "pt-BR": "Capítulo", vi: "Chương", id: "Bab", tr: "Bölüm", pl: "Rozdział" })}
        onClose={() => setLearningV2LockedSession(null)}
      />
      {/* lessonOrdinal={null} — словарь всего курса: урок называет каждая
          секция списка, а не шапка шторки (владелец 2026-09-21). */}
      {learningV2DictionaryOpen ? (
        <LearningV2LessonDictionaryOverlayV1
          lessonOrdinal={null}
          words={learningV2DictionaryWords}
          onClose={() => setLearningV2DictionaryOpen(false)}
        />
      ) : null}
      {/* зачем (Сверка learn-011/012/013, learn.html dlg): ворота списка — окно по центру с плиткой-замком/шапочкой
          и белой «Закрыть», а не общая шторка выбора. */}
      <LessonsGateDialog
        visible={gateModal !== null}
        icon={gateModal?.kind === "exam" || gateModal?.kind === "frenchExam" ? "school" : "lock"}
        title={
          gateModal?.kind === "frenchExam"
            ? frenchExamGateCopy("level", lang).title
            : gateModal?.kind === "exam"
              ? triLang(lang, {
                  ru: "Недоступно",
                  en: "Unavailable",
                  uk: "Недоступно",
                  es: "No disponible",
                  "pt-BR": "Indisponível",
                  vi: "Không khả dụng",
                  id: "Tidak tersedia",
                  tr: "Kullanılamaz",
                  pl: "Niedostępne",
                })
              : gateModal?.kind === "premium"
                ? triLang(lang, {
                    ru: "Plus",
                    en: "Plus",
                    uk: "Plus",
                    es: "Plus",
                    "pt-BR": "Plus",
                    vi: "Plus",
                    id: "Plus",
                    tr: "Plus",
                    pl: "Plus",
                  })
                : gateModal?.kind === "levelGate"
                  ? triLang(lang, {
                      ru: "Уровень пока закрыт",
                      en: "Level still locked",
                      uk: "Рівень поки закритий",
                      es: "Nivel bloqueado",
                      "pt-BR": "Nível bloqueado",
                      vi: "Cấp độ đang khóa",
                      id: "Level masih terkunci",
                      tr: "Seviye şimdilik kilitli",
                      pl: "Poziom jest zablokowany",
                    })
                  : gateModal?.kind === "lesson"
                    ? triLang(lang, {
                        ru: "Ещё рано",
                        en: "Lesson locked",
                        uk: "Урок заблоковано",
                        es: "Lección bloqueada",
                        "pt-BR": "Lição bloqueada",
                        vi: "Bài học bị khóa",
                        id: "Pelajaran terkunci",
                        tr: "Ders kilitli",
                        pl: "Lekcja zablokowana",
                      })
                    : ""
        }
        message={
          gateModal?.kind === "frenchExam"
            ? frenchExamGateCopy("level", lang).body
            : gateModal?.kind === "exam"
              ? triLang(lang, {
                  ru: `Пройди все уроки ${gateModal.level} с оценкой 4.5+, чтобы открыть`,
                  en: `Complete all ${gateModal.level} lessons with 4.5+ to unlock`,
                  uk: `Пройди всі уроки ${gateModal.level} з оцінкою 4.5+, щоб відкрити`,
                  es: `Completa todas las lecciones de ${gateModal.level} con nota mínima de 4,5 para desbloquear`,
                  "pt-BR": `Conclua todas as lições ${gateModal.level} com nota 4,5+ para desbloquear`,
                  vi: `Hoàn thành tất cả bài học ${gateModal.level} với điểm 4.5+ để mở khóa`,
                  id: `Selesaikan semua pelajaran ${gateModal.level} dengan nilai 4,5+ untuk membuka`,
                  tr: `Kilidi açmak için tüm ${gateModal.level} derslerini 4.5+ puanla tamamla`,
                  pl: `Ukończ wszystkie lekcje ${gateModal.level} z wynikiem 4,5+, aby odblokować`,
                })
              : gateModal?.kind === "levelGate"
                ? triLang(lang, {
                    ru: `Чтобы открыть уровень ${gateModal.level}, сначала сдай зачёт ${gateModal.prevLevel}.`,
                    en: `To unlock level ${gateModal.level}, first pass the ${gateModal.prevLevel} exam.`,
                    uk: `Щоб відкрити рівень ${gateModal.level}, спочатку склади залік ${gateModal.prevLevel}.`,
                    es: `Para abrir el nivel ${gateModal.level}, primero supera el examen de ${gateModal.prevLevel}.`,
                    "pt-BR": `Para abrir o nível ${gateModal.level}, primeiro passe no exame ${gateModal.prevLevel}.`,
                    vi: `Để mở cấp độ ${gateModal.level}, trước tiên hãy vượt qua bài kiểm tra ${gateModal.prevLevel}.`,
                    id: `Untuk membuka level ${gateModal.level}, lulus dulu ujian ${gateModal.prevLevel}.`,
                    tr: `${gateModal.level} seviyesini açmak için önce ${gateModal.prevLevel} sınavını geç.`,
                    pl: `Aby odblokować poziom ${gateModal.level}, najpierw zdaj egzamin ${gateModal.prevLevel}.`,
                  })
                : gateModal?.kind === "lesson"
                      ? triLang(lang, {
                          // зачем (владелец 2026-09-20): здесь стояло "Ещё рано" —
                          // дубль ЗАГОЛОВКА вместо требования. Человек видел дважды
                          // одну и ту же фразу и НЕ знал, что именно нужно сделать.
                          // Остальные 8 языков всё это время были написаны верно.
                          // зачем (R1 learn-011, образец learn.html gateLesson): прежняя строка обрывалась на «этот» без слова «урок».
                          ru: `Чтобы открыть этот урок, пройди урок ${gateModal.prevNum} на 2★.`,
                      en: `Complete lesson ${gateModal.prevNum} with 2★ to unlock`,
                      uk: `Щоб відкрити цей урок, пройди урок ${gateModal.prevNum} на 2★.`,
                      es: `Completa la lección ${gateModal.prevNum} con 2★ para desbloquear`,
                      "pt-BR": `Conclua a lição ${gateModal.prevNum} com 2★ para desbloquear`,
                      vi: `Hoàn thành bài học ${gateModal.prevNum} với 2★ để mở khóa`,
                      id: `Selesaikan pelajaran ${gateModal.prevNum} dengan 2★ untuk membuka`,
                      tr: `Kilidi açmak için ${gateModal.prevNum}. dersi 2★ ile tamamla`,
                      pl: `Ukończ lekcję ${gateModal.prevNum} na 2★, aby odblokować`,
                    })
                      : gateModal?.kind === "premium"
                        ? triLang(lang, {
                            ru: "Этот урок входит в Plus.",
                            en: "This lesson is part of Plus.",
                            uk: "Цей урок входить до Plus.",
                            es: "Esta lección forma parte de Plus.",
                            "pt-BR": "Esta lição faz parte do Plus.",
                            vi: "Bài học này thuộc Plus.",
                            id: "Pelajaran ini termasuk Plus.",
                            tr: "Bu ders Plus kapsamındadır.",
                            pl: "Ta lekcja jest częścią Plus.",
                          })
                    : ""
        }
        // зачем: D107/D70 — покупка урока за жемчуг удалена; у ворот одна кнопка — «Закрыть».
        closeLabel={triLang(lang, {
          ru: "Закрыть",
          en: "Close",
          uk: "Закрити",
          es: "Cerrar",
          "pt-BR": "Fechar",
          vi: "Đóng",
          id: "Tutup",
          tr: "Kapat",
          pl: "Zamknij",
        })}
        onClose={() => setGateModal(null)}
      />
    </>
  );
}

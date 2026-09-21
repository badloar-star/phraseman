import { LEARNING_V2_OWNER_EN_TITLES_RU } from "../../components/learning-v2/learningV2OwnerLayout";
import LearningV2PulseCourse from "../../components/learning-v2/LearningV2PulseCourse";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
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
import * as Crypto from "expo-crypto";
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
import FirstPurchaseSealCelebration from "../../components/FirstPurchaseSealCelebration";
import { useFocusEffect, useRouter } from "expo-router";
import { useFeatureAccess, usePremium } from "../../components/PremiumContext";
import {
  FREE_LESSON_LIMIT,
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from "../monetization_policy";
import { openPremiumPaywall } from "../paywall_navigation";
import {
  LESSON_PEARL_UNLOCK_PRICE,
  buyLessonWithPearls,
} from "../lessons_pearl_unlock";
// зачем: настоящий ассет жемчужины на кнопке разблокировки (владелец 18.09).
// Тот же источник, что в шите покупки наборов — иконка не разойдётся.
import { oskolokImageForPackShards } from "../oskolok";
import { getShardsBalance } from "../shards_system";
import { lessonPurchaseContinuationParams } from "../paywall_lesson_continuation";
import { HOME_BACK_FALLBACK, safeRouterBack } from "../navigation_back";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from "../account_generation";
import { useAppSnapshotSelector } from "../app_snapshot_store";
import { getStableId, peekStableId } from "../stable_id";
import { projectDevLessonAccess } from "../dev_plus_controls";
import { useTabNav } from "../TabContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../components/ThemeContext";
import { useLang } from "../../components/LangContext";
import { useStudyTarget } from "../../components/StudyTargetContext";
import ScreenGradient from "../../components/ScreenGradient";
import { useTopFadeScroll } from "../../components/TopFadeScrollContext";
import { useBouncy, useBouncyStyle } from "../../components/BouncyScrollView";
import { LinearGradient } from "../../components/SafeLinearGradient";
import { triLang, type Lang } from "../../constants/i18n";
import {
  GOLD_GRADIENTS,
  GOLD_RICH,
  GOLD_SURFACE_LOCATIONS,
  goldCardGradient,
  goldCefrAccent,
  goldShadow,
} from "../../constants/goldTheme";
import { OLIVE_GRADIENTS, oliveShadow } from "../../constants/oliveTheme";
import { getLessonExamIcon } from "../../constants/generatedThemeIconAssets";
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
import LearningV2InlineNodeReveal from "../../components/LearningV2InlineNodeReveal";
import LearningV2MapNode from "../../components/LearningV2MapNode";
import type { LearningV2RuneFlightPoint } from "../../components/LearningV2RuneFlight";
import RuneBalanceChip from "../../components/RuneBalanceChip";
import { soundDirector } from "../../modules/audio/sound_director";
import {
  hydrateLearningV2SessionStarResults,
  peekLearningV2SessionStarResults,
  subscribeLearningV2SessionStarResults,
  type LearningV2SessionStarResultsV1,
} from "../learning_v2_session_star_results_store";
import { getExamMedalTier, getEarnedDots } from "../medal_utils";
import { prefetchLessonMenuCache } from "../lesson_menu";
import ReportErrorButton from "../../components/ReportErrorButton";
import ThemedChoiceModal from "../../components/ThemedChoiceModal";
import LearningV2SessionOutcomeSheet, {
  LEARNING_V2_SESSION_MODAL_EXIT_MS,
} from "../../components/LearningV2SessionOutcomeSheet";
import LearningV2LessonDictionaryOverlayV1 from "../../components/learning-v2/LearningV2LessonDictionaryOverlayV1";
import LearningV2FounderPassModal from "../../components/learning-v2/LearningV2FounderPassModal";
import { useHideTabBar } from "../../components/TabBarVisibilityContext";
import { useLearningV2UnlockedLessonWordsV1 } from "../../hooks/use_learning_v2_unlocked_lesson_words_v1";
import { useRequestedFeatureIntro } from "../../hooks/use_requested_feature_intro";
import FeatureIntroModal from "../../components/FeatureIntroModal";
import PressableHybrid from "../../components/PressableHybrid";
import EnergyBar from "../../components/EnergyBar";
import DialogsTabContent from "../../components/DialogsTabContent";
import PlusBadge from "../../components/PlusBadge";
import { isAiDialogEnabled } from "../ai_dialog_flags";
import { readAnyPersonalPlanState } from "../personal_plan_state";
import {
  PERSONAL_PLAN_SUNSET_AT_MS,
  resolvePersonalPlanPremiumProbe,
  isPersonalPlanDevBypassActive,
  resolvePersonalPlanSunsetAccess,
} from "../personal_plan_sunset";
import { readPersonalPlanSunsetEffectiveNow } from "../personal_plan_sunset_clock";
import { redirectRetiredPersonalPlan } from "../personal_plan_retired_redirect";
import { onAppEvent } from "../events";
import { shouldGateFeature } from "../feature_gates";
import {
  getVerifiedPremiumAccessStatus,
  invalidatePremiumCache,
} from "../premium_guard";
import {
  COURSE_LEVELS,
  COURSE_LEVEL_RANGES,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  getPreviousCourseLevel,
  type CourseLevel,
} from "../course_levels";
import { featureIntroById } from "../feature_intro_registry";
import { featureIntroClose } from "../feature_intro_copy";
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
import { getHomeMenuImages } from "../home_menu_icons";
import { useStableSafeAreaInsets } from "../stable_safe_area_metrics";
import {
  animateNextLayoutShiftWithoutEntryFade,
  animateNextLayoutTransition,
} from "../smooth_layout";
import { peekCurrentExamBestPct } from "../exam_best_pct_overlay";
import { noAndroidOutline } from "../../constants/androidGlow";
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
import {
  markLearningV2SessionLaunchStageV1,
  startLearningV2SessionLaunchTraceV1,
} from "../learning_v2_session_launch_trace_v1";
// зачем: аудит 20.09 — эти модули тянут 556 КБ + 504 КБ генерированных данных,
// которые нужны ТОЛЬКО при запуске занятия, а разбирались при каждом открытии
// раздела. Грузим лениво; проверка «есть ли озвучка» вынесена в лёгкий срез
// на 1 КБ (learning_v2_published_audio_sessions_v1.generated).
import { learningV2HasPublishedAudioV1 } from "../learning_v2_published_audio_sessions_v1.generated";

// Ленивые загрузчики тяжёлых модулей Learning V2.
// Промис кэшируется: модуль парсится ОДИН раз, при первом запуске занятия,
// а не при каждом открытии раздела. Суммарно снимает ~2,2 МБ с входа.
type LearningV2SessionClientV3Module =
  typeof import("../learning_v2_course_released_session_client_v3");
let learningV2SessionClientV3Promise: Promise<LearningV2SessionClientV3Module> | null =
  null;
// зачем: тайминг трассировки нужен синхронно — handle физически не может
// существовать до загрузки модуля, поэтому держим ссылку на уже загруженный
// модуль и не заворачиваем разметку трассы в лишний then.
let learningV2SessionClientV3Loaded: LearningV2SessionClientV3Module | null = null;
function loadLearningV2SessionClientV3() {
  if (!learningV2SessionClientV3Promise) {
    learningV2SessionClientV3Promise = import(
      "../learning_v2_course_released_session_client_v3"
    )
      .then((mod) => {
        learningV2SessionClientV3Loaded = mod;
        return mod;
      })
      .catch((error) => {
        // Немой catch запрещён: без этого модуля занятие не запустится.
        learningV2SessionClientV3Promise = null;
        DebugLogger.error(
          "learning_v2:session_client_lazy_import",
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
        throw error;
      });
  }
  return learningV2SessionClientV3Promise;
}

let learningV2AudioPackPromise:
  | Promise<typeof import("../learning_v2_lesson_audio_pack_v1")>
  | null = null;
function loadLearningV2AudioPackV1() {
  if (!learningV2AudioPackPromise) {
    learningV2AudioPackPromise = import("../learning_v2_lesson_audio_pack_v1").catch(
      (error) => {
        learningV2AudioPackPromise = null;
        DebugLogger.error(
          "learning_v2:audio_pack_lazy_import",
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
        throw error;
      },
    );
  }
  return learningV2AudioPackPromise;
}
// зачем: координатор статически тянет learning_v2_lesson_audio_pack_v1 (556 КБ +
// 504 КБ). Без ленивого импорта он обходил бы ленивую загрузку аудиопака выше —
// вес возвращался бы этим путём (аудит 20.09).
import type { LearningV2ActiveCourseCatalogV1 } from "../../modules/learning-v2/runtime/course_active_catalog_v1";
import type { LearningV2CourseSessionOutcomeKindV1 } from "../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import { learningV2CourseSessionIdV1 } from "../../modules/learning-v2/content/course_topology_v1";
import { learningV2SessionTitleV1 } from "../../modules/learning-v2/content/session_titles_v1.generated";
import {
  factoryNativeLearningV2AvailabilityV1,
  factoryNativeLearningV2NewWordCountV1,
} from "../../modules/learning-v2/content/factory_native/factory_native_catalog_v1";
import { DebugLogger } from '../debug-logger';
import {
  normalizeLearningV2FounderNicknameV1,
  readLearningV2FounderPassReceiptV1,
  resolveLearningV2FounderPassGateV1,
  writeLearningV2FounderPassReceiptV1,
} from "../learning_v2_release_intro_receipt_v1";
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
// ── Список уроков: один стиль «Туман / Графит» (мягкие заливки + чернила) во всех темах приложения ──
const PALETTE_SKETCH: Record<string, string> = {
  A1: "#D4CCBC",
  A2: "#C5BBA8",
  B1: "#B4AA9A",
  B2: "#A19D95",
};
const LESSON_LEVEL_PALETTES: Record<string, Record<string, string>> = {
  dark: {
    A1: "#B8D6B8",
    A2: "#A7CFB0",
    B1: "#C6D79B",
    B2: "#96BEA0",
  },
  gold: {
    A1: "#F2DFA5",
    A2: "#E6C878",
    B1: "#D0A95B",
    B2: "#B88A45",
  },
  olive: {
    A1: "#D9C98C",
    A2: "#C9A84C",
    B1: "#9E9D69",
    B2: "#77815B",
  },
  // ─── «Чёрное кино» (midnight/ember/aurora/volt) ──────────────────────────
  // Обложки уроков в тон спектру каждой темы (см. constants/cinemaThemes.ts):
  // 4 «голоса» спектра на A1→B2, светлые и насыщенные (далее darkenHex красит
  // фон карточки, lessonAccent=bg — обводку/текст/прогресс). Та же логика, что
  // у dark (Форест) / indigo.
  midnight: {
    A1: "#8FA0FF", // accent — электрик-синий
    A2: "#B79CFF", // second — сине-фиолетовый
    B1: "#FFD27A", // gold   — тёплый контраст (как у Форест на B1)
    B2: "#A95BFF", // bloomB — финальный фиолет
  },
  ember: {
    A1: "#FFA245", // accent — янтарь
    A2: "#FFC894", // second — светлый янтарь
    B1: "#5FE8A8", // correct — мятный контраст
    B2: "#FF3D6E", // bloomB — малиновый закат
  },
  aurora: {
    A1: "#3DE8A6", // accent — мята
    A2: "#9FF2D4", // second — светлая мята
    B1: "#F2D27A", // gold   — тёплый контраст
    B2: "#2E9DFF", // bloomB — лазурь
  },
  volt: {
    A1: "#D6FF3D", // accent — лайм
    A2: "#EAFF8C", // second — светлый лайм
    B1: "#4FE8AC", // correct — изумрудный контраст
    B2: "#2EE08C", // bloomB — зелёный
  },
};
const EXAM_META_SKETCH: Record<
  string,
  {
    bg: string;
    accent: string;
  }
> = {
  A1: { bg: "#3F3D39", accent: "#F3F0E8" },
  A2: { bg: "#353638", accent: "#ECEFF3" },
  B1: { bg: "#2C3035", accent: "#E5E9EF" },
  B2: { bg: "#242932", accent: "#EEF2F8" },
};
const EXAM_META_BY_THEME: Record<string, typeof EXAM_META_SKETCH> = {
  olive: {
    A1: { bg: "#202417", accent: "#F4ECD8" },
    A2: { bg: "#1B2013", accent: "#E3CC88" },
    B1: { bg: "#161B11", accent: "#C9A84C" },
    B2: { bg: "#11150D", accent: "#B9BF96" },
  },
  dark: {
    A1: { bg: "#344637", accent: "#E2F4E3" },
    A2: { bg: "#304333", accent: "#DDF2E1" },
    B1: { bg: "#41472D", accent: "#F0F7D7" },
    B2: { bg: "#2F3F34", accent: "#D9EFDF" },
  },
  // ─── «Чёрное кино» — плашки зачётов в тон спектру (см. cinemaThemes.ts) ───
  // bg: тёмная подложка с подтоном спектра; accent: светлый голос спектра.
  midnight: {
    A1: { bg: "#1B1F36", accent: "#C9D2FF" },
    A2: { bg: "#232948", accent: "#D8CCFF" },
    B1: { bg: "#2A2B3F", accent: "#FFE3B0" },
    B2: { bg: "#26203F", accent: "#D9B5FF" },
  },
  ember: {
    A1: { bg: "#281B10", accent: "#FFD9A8" },
    A2: { bg: "#332215", accent: "#FFE6C9" },
    B1: { bg: "#1F2A1C", accent: "#BFF5DA" },
    B2: { bg: "#33161F", accent: "#FFB5C4" },
  },
  aurora: {
    A1: { bg: "#15241C", accent: "#9FF2CF" },
    A2: { bg: "#1C2F24", accent: "#C7F7E5" },
    B1: { bg: "#2A2A1C", accent: "#F7E6B0" },
    B2: { bg: "#162636", accent: "#A8D8FF" },
  },
  volt: {
    A1: { bg: "#20250E", accent: "#EFFF9E" },
    A2: { bg: "#2A3013", accent: "#F4FFC4" },
    B1: { bg: "#16251C", accent: "#B5F5D8" },
    B2: { bg: "#1A2A1E", accent: "#A8F0C8" },
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
function bookPalette(num: number, themeMode = "indigo"): string {
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
  themeMode,
  size,
  label,
}: {
  themeMode: ThemeMode;
  size: number;
  label: string;
}) {
  return (
    <Image
      source={getLessonExamIcon(themeMode)}
      style={{ width: size, height: size, flexShrink: 0 }}
      contentFit="contain"
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
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
  textShadowColor: "rgba(0,0,0,0.50)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};
const LESSON_CARD_ACCENT_TEXT_SHADOW = {
  textShadowColor: "rgba(0,0,0,0.46)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};
const LESSON_CARD_FILLED_META_TEXT = "#07110A";
const LESSON_CARD_OPEN_META_TEXT = LESSON_CARD_FILLED_META_TEXT;

interface TabUnderlineButtonProps {
  label: string;
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
                color: badgeTextColor ?? "#fff",
                fontSize: 10,
                fontWeight: "900",
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
}

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
}: LessonCardProps) {
  const isSagePorcelainCard = isLightThemeMode(_themeMode);
  const isOliveTheme = _themeMode === "olive";
  const lockedCardHasLightFill = isLightThemeMode(_themeMode);
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
          shadowColor: isGoldTheme ? "#000" : darkenHexCached(bg, 0.28),
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
          ...{},
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
            const access = resolveLessonAccess({
              lessonId: num,
              unlocked: isUnlocked,
              purchased: purchasedLesson,
              isPremium,
              devMode: effectiveDevContentUnlock,
              noLimits,
              legacyFreeLessonCap,
            });
            if (access === "available") {
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
            borderWidth: isOliveTheme
              ? 0
              : isGoldTheme || isSagePorcelainCard
                ? 1
                : USE_ELITE_LESSONS_MAP
                  ? 1
                  : useSketchLessonVisual && isUnlocked
                    ? 1.5
                    : 0,
            borderColor: isGoldTheme
              ? isCurrent
                ? GOLD_RICH.hairlineStrong
                : isUnlocked
                  ? goldHairline
                  : GOLD_RICH.hairlineQuiet
              : isSagePorcelainCard
                ? rgbaHexCached(
                    lessonAccent,
                    isCurrent ? 0.56 : isUnlocked ? 0.38 : 0.26,
                  )
                : USE_ELITE_LESSONS_MAP
                  ? rgbaHexCached(
                      lessonAccent,
                      isCurrent ? 0.7 : isUnlocked ? 0.36 : 0.16,
                    )
                  : useSketchLessonVisual && isUnlocked
                    ? rgbaHexCached(lessonAccent, 0.44)
                    : "transparent",
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
                "rgba(0,0,0,0)",
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
          {showLessonProgressFill && (
            <LinearGradient
              colors={
                isGoldTheme
                  ? ([goldAntique, goldBright, lessonAccent] as [
                      string,
                      string,
                      string,
                    ])
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
                width: `${progPct}%`,
                opacity: isGoldTheme
                  ? levelLockedByExam
                    ? 0.16
                    : 0.22
                  : levelLockedByExam
                    ? 0.28
                    : 1,
                borderTopLeftRadius: cardRadius,
                borderBottomLeftRadius: cardRadius,
                borderTopRightRadius: cardRadius,
                borderBottomRightRadius: cardRadius,
              }}
            />
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
                  : isSagePorcelainCard
                    ? rgbaHexCached(lessonAccent, 0.38)
                    : useSketchLessonVisual
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(255,255,255,0.3)",
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
                    ? LESSON_CARD_OPEN_META_TEXT
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
                      <Circle cx={17} cy={17} r={14} fill="none" stroke={useDarkMetaText ? "rgba(7,17,10,0.2)" : "rgba(255,255,255,0.24)"} strokeWidth={4} />
                      {progPct > 0 ? (
                        <Circle
                          cx={17}
                          cy={17}
                          r={14}
                          fill="none"
                          stroke={useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor}
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
                        color={useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor}
                      />
                    ) : isComplete ? (
                      <Ionicons name="checkmark" size={15} color={useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor} />
                    ) : (
                      <Text style={{ color: useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor, fontSize: 9.5, fontWeight: "700" }}>{progPct}%</Text>
                    )}
                  </View>
                ) : purchasedLesson ? (
                  <Text
                    style={{
                      color: useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor,
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
                          : "rgba(255,255,255,0.55)"
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
                        ? LESSON_CARD_OPEN_META_TEXT
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
              numberOfLines={learningV2 ? 2 : undefined}
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
const LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY = true;

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

function neutralLearningV2SessionOutcome(sessionOrdinal: number): string {
  if (sessionOrdinal <= 4) {
    return "Ты поймёшь, как am, is и are превращают отдельные слова в законченную фразу.";
  }
  if (sessionOrdinal <= 8) {
    return "Ты научишься собирать простые фразы с глаголом to be.";
  }
  return "Ты сможешь без подсказки применять am, is и are в разговоре.";
}

function neutralLearningV2SessionOutcomeKind(
  sessionOrdinal: number,
): LearningV2CourseSessionOutcomeKindV1 {
  if (sessionOrdinal <= 4) return "understand";
  if (sessionOrdinal <= 8) return "learn";
  return "can_do";
}

function learningV2SessionOutcomeTitle(
  kind: LearningV2CourseSessionOutcomeKindV1,
  lang: Lang,
): string {
  if (kind === "understand") {
    return triLang(lang, {
      ru: "Что ты поймёшь",
      en: "What you'll understand",
      uk: "Що ви зрозумієте",
      es: "Qué entenderás",
      "pt-BR": "O que você vai entender",
      vi: "Bạn sẽ hiểu gì",
      id: "Yang akan kamu pahami",
      tr: "Ne anlayacaksınız",
      pl: "Co zrozumiesz",
    });
  }
  if (kind === "learn") {
    return triLang(lang, {
      ru: "Чему научишься",
      en: "What you'll learn",
      uk: "Чого ви навчитеся",
      es: "Qué aprenderás",
      "pt-BR": "O que você vai aprender",
      vi: "Bạn sẽ học gì",
      id: "Yang akan kamu pelajari",
      tr: "Ne öğreneceksiniz",
      pl: "Czego się nauczysz",
    });
  }
  return triLang(lang, {
    ru: "Что сможешь делать",
    en: "What you'll be able to do",
    uk: "Що ви зможете робити",
    es: "Qué podrás hacer",
    "pt-BR": "O que você conseguirá fazer",
    vi: "Bạn sẽ làm được gì",
    id: "Yang akan bisa kamu lakukan",
    tr: "Ne yapabileceksiniz",
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
    ? "новое слово"
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? "новых слова"
      : "новых слов";
  const ukWord = count % 10 === 1 && count % 100 !== 11
    ? "нове слово"
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
      ? "нові слова"
      : "нових слів";
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
  /** Звёзды 0–3 за пройденную сессию (витрина, без авторитета). */
  earnedStars?: 0 | 1 | 2 | 3;
  onSessionPress: (
    lessonOrdinal: number,
    sessionOrdinal: number,
    state: LearningV2AccordionSessionStateV1,
  ) => void;
  onSessionCompleted?: (point: LearningV2RuneFlightPoint) => void;
}>) {
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
            color: theme.accent,
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
  const accessible = devUnlockAll || current || completed;
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
          haloColor={current ? theme.accent : undefined}
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
            opacity: row.state === "locked" && !devUnlocked ? 0.78 : 1,
          }}
        >
          {checkpoint ? (
            <Ionicons
              name="trophy"
              size={26}
              color={
                current || completed
                  ? theme.correctText
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
                  ? theme.correctText
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
                color={slot < earnedStars ? theme.gold : theme.textMuted}
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
                  ? theme.accent
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
                color: theme.accent,
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
              fontSize: 10,
              fontWeight: "900",
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
      return pluralSlavic(count, "урок", "уроки", "уроків");
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
      return pluralSlavic(count, "урок", "урока", "уроков");
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
  const isRetainedTab = presentation === "tab";
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const topFadeScroll = useTopFadeScroll();
  const { goHome, focusTick, runtimeOwnerId } = useTabNav();
  const { theme: t, f, themeMode } = useTheme();
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
  const menuImages = getHomeMenuImages(themeMode);
  const screenTitleColor = t.textPrimary;
  const { lang, s } = useLang();
  const learningV2SnapshotNickname = useAppSnapshotSelector(
    (snapshot) => snapshot.profile?.name ?? "",
    (left, right) => left === right,
  );
  const { studyTarget, refresh: refreshStudyTarget } = useStudyTarget();
  const lessonCacheTarget = storageStudyTarget(studyTarget);
  const lessonCacheTargetRef = useRef(lessonCacheTarget);
  lessonCacheTargetRef.current = lessonCacheTarget;
  const boot =
    readLessonsUiSessionCache(lessonCacheTarget) ??
    getLessonsTabInitialState(studyTarget);
  const [noLimits, setNoLimits] = useState(() => boot?.noLimits ?? false);
  const [legacyFreeLessonCap, setLegacyFreeLessonCap] = useState(
    () => boot?.legacyFreeLessonCap ?? FREE_LESSON_LIMIT,
  );
  const {
    hasPremiumAccess: isPremium,
    devLocalPlusOverride,
    accessResolved,
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
  const planAccess = useFeatureAccess("personal_plan");
  const personalPlanFeatureRequiresPremium = shouldGateFeature(
    "personal_plan",
    false,
  );
  const [personalPlanSunsetTabVisible, setPersonalPlanSunsetTabVisible] =
    useState(false);
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
  // (после прохождения предыдущего на ★2.5+, покупки премиума, сдачи зачёта).
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
  const {
    GestureWrap: BouncyWrap,
    stretch: bouncyStretch,
    onBouncyScroll,
  } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const lessonsTabVisible = isRetainedTab && runtimeOwnerId === "lessons";
  const lessonsRuntimeActive = useRuntimeActive(
    isRetainedTab ? lessonsTabVisible : true,
  );
  // Learning V2 повторно использует этот же список и тот же LessonCard.
  // Карта раскрывается прямо под выбранной плашкой; одновременно открыта одна.
  const dialogsEnabled = isAiDialogEnabled();
  const [page, setPage] = useState<"lessons" | "dialogs" | "v2">(initialPage);
  // зачем: карта Learning V2 занимает весь экран, а раздел открывается ВНУТРИ
  // вкладки — таббар с Главной оставался поверх карты (владелец 20.09).
  // Прячем его только пока открыта карта; при уходе запрос отпускается сам.
  useHideTabBar(page === "v2");
  const [learningV2FounderNickname, setLearningV2FounderNickname] =
    useState<string | null>(() =>
      normalizeLearningV2FounderNicknameV1(learningV2SnapshotNickname),
    );
  const [learningV2FounderReceipt, setLearningV2FounderReceipt] = useState<{
    accountScopeHash: string | null;
    seen: boolean | null;
  }>({ accountScopeHash: null, seen: null });
  const [learningV2FounderDismissedScope, setLearningV2FounderDismissedScope] =
    useState<string | null>(null);

  useEffect(() => {
    const nickname = normalizeLearningV2FounderNicknameV1(
      learningV2SnapshotNickname,
    );
    if (nickname) setLearningV2FounderNickname(nickname);
  }, [learningV2SnapshotNickname]);

  // зачем: здесь жили дев-счётчики входа (devEntryOrdinal /
  // devDismissedEntryOrdinal). Гейт их уже не читал, но они росли на входе и
  // давали лишний ре-рендер экрана в момент открытия раздела — ровно там, где
  // владелец видел моргание. Механизм удалён целиком: и в деве, и в проде
  // решает один признак — закрывали модал или нет.

  useEffect(() => {
    if (page !== "v2" || !lessonsRuntimeActive) return;
    // зачем: здесь стоял безусловный сброс
    // setLearningV2FounderReceipt({ accountScopeHash: null, seen: null }).
    // Он выполнялся на КАЖДЫЙ focusTick и обнулял уже решённый гейт — раздел
    // снова уходил в «не решено» и перерисовывался. Курс больше не прячется
    // за этим чеком (revealCourse всегда true), поэтому обнулять нечего:
    // сброс нужен ТОЛЬКО при смене аккаунта, чтобы чужой `seen: true` не
    // погасил модал новому человеку. Сравниваем по accountScopeHash ниже.
    let cancelled = false;
    void (async () => {
      if (captureAccountGeneration().phase !== "active") await getStableId();
      const account = captureAccountGeneration();
      if (account.phase !== "active" || !account.stableId) return;
      const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(
        account.stableId,
      );
      try {
        const [seen, storedNickname] = await Promise.all([
          readLearningV2FounderPassReceiptV1(AsyncStorage, accountScopeHash),
          AsyncStorage.getItem("user_name"),
        ]);
        if (
          cancelled ||
          !isCurrentAccountGeneration(account, account.stableId)
        ) return;
        const nickname =
          normalizeLearningV2FounderNicknameV1(learningV2SnapshotNickname) ??
          normalizeLearningV2FounderNicknameV1(storedNickname);
        setLearningV2FounderNickname(nickname);
        // зачем: раньше сюда каждый фокус приходил НОВЫЙ объект с тем же
        // содержимым — React считал состояние изменённым и перерисовывал весь
        // экран с картой. Меняем состояние только когда оно реально другое.
        setLearningV2FounderReceipt((previous) =>
          previous.accountScopeHash === accountScopeHash &&
          previous.seen === seen
            ? previous
            : { accountScopeHash, seen },
        );
        // Смена аккаунта обязана снять локальное «закрыто» предыдущего
        // человека, иначе новому модал не покажется ни разу.
        setLearningV2FounderDismissedScope((previous) =>
          previous === null || previous === accountScopeHash ? previous : null,
        );
      } catch (error) {
        if (
          cancelled ||
          !isCurrentAccountGeneration(account, account.stableId)
        ) return;
        // Fail closed: storage trouble must not turn a one-time welcome into a
        // modal that reappears on every focus.
        setLearningV2FounderReceipt((previous) =>
          previous.accountScopeHash === accountScopeHash && previous.seen === true
            ? previous
            : { accountScopeHash, seen: true },
        );
        DebugLogger.error(
          "learning_v2:founder_pass_read",
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focusTick, learningV2SnapshotNickname, lessonsRuntimeActive, page]);

  const dismissLearningV2FounderPass = useCallback(() => {
    const accountScopeHash = learningV2FounderReceipt.accountScopeHash;
    if (!accountScopeHash) {
      // Ранний выход обязан называть причину (правило «сперва логи»).
      if (__DEV__) console.log('[FOUNDER] dismiss:skip', JSON.stringify({ reason: 'no_account_scope' }));
      return;
    }
    // зачем: владелец 20.09 — «модал должен и в дев показываться только
    // единожды». Здесь была дев-ветка: она ставила счётчик закрытия и
    // ВЫХОДИЛА, не сохранив чек. Поэтому в деве закрытие жило только до
    // следующего фокуса экрана и модал возвращался. Теперь дев и прод
    // закрывают модал одинаково — записью чека.
    setLearningV2FounderDismissedScope(accountScopeHash);
    // Optimistic UI: гейт закрывает модал сразу по локальному признаку,
    // запись чека в хранилище догоняет фоном. Иначе модал жил бы до конца
    // асинхронной записи и мигал.
    setLearningV2FounderReceipt({ accountScopeHash, seen: true });
    const account = captureAccountGeneration();
    if (account.phase !== "active" || !account.stableId) return;
    if (
      deriveLocalOfflineProgressAccountScopeHash(account.stableId) !==
      accountScopeHash
    ) return;
    void writeLearningV2FounderPassReceiptV1(
      AsyncStorage,
      accountScopeHash,
    )
      .then(() => {
        if (!isCurrentAccountGeneration(account, account.stableId)) return;
        setLearningV2FounderReceipt({ accountScopeHash, seen: true });
      })
      .catch((error) => {
        DebugLogger.error(
          "learning_v2:founder_pass_write",
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
      });
  }, [learningV2FounderReceipt.accountScopeHash]);

  const learningV2FounderPassGate = resolveLearningV2FounderPassGateV1({
    active: page === "v2" && lessonsRuntimeActive,
    isDev: __DEV__,
    accountReady: learningV2FounderReceipt.accountScopeHash !== null,
    receiptSeen: learningV2FounderReceipt.seen,
    productionDismissed:
      learningV2FounderReceipt.accountScopeHash !== null &&
      learningV2FounderDismissedScope ===
        learningV2FounderReceipt.accountScopeHash,
  });
  const learningV2FounderPassVisible = learningV2FounderPassGate.visible;
  const [legacySelectedLevel, setLegacySelectedLevel] =
    useState<CourseLevel>("A1");
  // зачем (аудит 2026-09-21): поиск по урокам открывается ЛУПОЙ в ряду чипов,
  // а не живёт постоянной строкой — владелец: «не фулл строка ввода, а просто
  // кнопочка». Поле раскрывается НАД рядом, поэтому ряд чипов не сдвигается.
  const [legacySearchOpen, setLegacySearchOpen] = useState(false);
  const [legacyLessonQuery, setLegacyLessonQuery] = useState("");
  const [learningV2DevUnlockAllRequested, setLearningV2DevUnlockAllRequested] =
    useState(false);
  const learningV2DevUnlockAllActive =
    __DEV__ && ENABLE_DEV_TOOLS && learningV2DevUnlockAllRequested;
  const [expandedLearningV2Lesson, setExpandedLearningV2Lesson] = useState<
    number | null
  >(null);
  const [learningV2DictionaryOpen, setLearningV2DictionaryOpen] =
    useState(false);
  const learningV2DictionaryScope = useMemo(
    () =>
      page === "v2" && expandedLearningV2Lesson !== null
        ? {
            targetLanguage: studyTarget,
            lessonOrdinal: expandedLearningV2Lesson,
          }
        : null,
    [expandedLearningV2Lesson, page, studyTarget],
  );
  const { words: learningV2DictionaryWords } =
    useLearningV2UnlockedLessonWordsV1(learningV2DictionaryScope, {
      includeAuthoringPreview: __DEV__,
    });
  const [selectedLearningV2Session, setSelectedLearningV2Session] = useState<{
    lessonOrdinal: number;
    sessionOrdinal: number;
    state: LearningV2AccordionSessionStateV1;
    traceId: string;
  } | null>(null);
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
  const [learningV2Catalog, setLearningV2Catalog] =
    useState<LearningV2ActiveCourseCatalogV1 | null>(() => {
      const stableId = peekStableId();
      return stableId
        ? peekLearningV2ActiveCourseCatalogV1(
            learningV2CatalogLocator,
            deriveLocalOfflineProgressAccountScopeHash(stableId),
          )
        : null;
    });
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
  const learningV2WarmupEnabled = ENABLE_DEV_TOOLS || page === "v2";
  useFocusEffect(
    useCallback(() => {
      if (!learningV2WarmupEnabled) return undefined;
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
    }, [learningV2WarmupEnabled]),
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
        .catch(() => undefined);
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
  const learningV2ProjectionScopeKey = useMemo(
    () =>
      `${learningV2AccountGeneration}:${studyTarget}:${_overlayIdentityEpoch}`,
    [_overlayIdentityEpoch, learningV2AccountGeneration, studyTarget],
  );
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
        )
      : "");
  const selectedLearningV2NewWordCount = selectedLearningV2Session && studyTarget === "en"
    ? factoryNativeLearningV2NewWordCountV1(
        selectedLearningV2Session.lessonOrdinal,
        selectedLearningV2Session.sessionOrdinal,
      )
    : null;
  const learningV2FactoryNativeSessionIds = useMemo(
    () => new Set(
      factoryNativeLearningV2AvailabilityV1().sessions.map(
        (session) => session.courseSessionId,
      ),
    ),
    [],
  );
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
      const sessionRunId = Crypto.randomUUID();
      const operation = learningV2DevUnlockAllActive && studyTarget === "en"
        ? Promise.resolve({ key, sessionRunId, handle: null })
        : loadLearningV2SessionClientV3()
            .then((mod) =>
              mod.prepareCurrentLearningV2CourseSessionV3({
                locator: {
                  environment: learningV2Catalog?.environment ?? "production",
                  targetLanguage: studyTarget,
                  studyTarget,
                  learnerSourceLocale: lang,
                  seasonId: learningV2Catalog?.seasonId ?? "learning-v2",
                  lessonOrdinal,
                  sessionOrdinal,
                },
                sessionRunId,
              }),
            )
            .then((handle) => ({ key, sessionRunId, handle }));
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
      const sessionClient = learningV2SessionClientV3Loaded;
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
    [studyTarget],
  );
  const currentLessonOrdinal = currentLearningV2SessionCoordinates?.lessonOrdinal ?? 1;
  const prepareLearningV2AudioSession = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) => {
      if (studyTarget !== "en" && studyTarget !== "es") return Promise.resolve();
      return loadLearningV2AudioPackV1()
        .then((mod) =>
          mod.prepareLearningV2SessionAudioPackV1({
            lessonOrdinal,
            sessionOrdinal,
            targetLanguage: studyTarget,
          }),
        )
        .then(() => undefined);
    },
    [studyTarget],
  );
  const prepareLearningV2SessionLaunch = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) =>
      prepareLearningV2SessionBeforeModal(lessonOrdinal, sessionOrdinal),
    [prepareLearningV2SessionBeforeModal],
  );
  const prewarmLearningV2SessionLaunch = useCallback(
    (lessonOrdinal: number, sessionOrdinal: number) => {
      // Material preparation is local and must never queue behind a remote
      // audio miss. Audio continues independently and cannot reject the Start
      // path or suppress the prepared material handle.
      const material = prepareLearningV2SessionBeforeModal(lessonOrdinal, sessionOrdinal);
      if (
        (studyTarget !== "en" && studyTarget !== "es") ||
        // зачем: тот же ответ, что у isLearningV2SessionAudioPublishedV1, но по
        // срезу на 1 КБ — иначе ради списка номеров разбирались бы 504 КБ хэшей
        // при каждом открытии раздела (аудит 20.09).
        (studyTarget === "en"
          ? learningV2HasPublishedAudioV1(lessonOrdinal, sessionOrdinal)
          : lessonOrdinal === 1 && (sessionOrdinal === 1 || sessionOrdinal === 2))
      ) {
        void prepareLearningV2AudioSession(lessonOrdinal, sessionOrdinal).catch(() => undefined);
      }
      return material;
    },
    [prepareLearningV2AudioSession, prepareLearningV2SessionBeforeModal, studyTarget],
  );

  useEffect(() => {
    if (page !== "v2" || !lessonsRuntimeActive || !learningV2ProgressHydrated || (studyTarget !== "en" && studyTarget !== "es"))
      return;
    let cancelled = false;
    const currentSessionOrdinal = currentLearningV2SessionCoordinates?.sessionOrdinal ?? 1;
    // This is intentionally fire-and-forget: map and session modals never wait
    // for audio I/O. The coordinator persists the request, resumes on network
    // changes, prioritizes three sessions, then fills released lessons on Wi-Fi.
    //
    // зачем: динамический import парсит модуль на JS-потоке, а координатор
    // сразу тянет аудио. Замер 20.09 показал, что вместе с прогревом занятия
    // это давало семь сборок мусора подряд и держало поток 6+ секунд — ровно
    // в тот момент, когда человек ждал первый кадр карты. Ждём кадр: сначала
    // карта на экране, потом тяжёлое.
    let frame: number | null = requestAnimationFrame(() => {
      frame = null;
      if (cancelled) return;
      void import("../learning_v2_audio_prefetch_coordinator_v1")
        .then(({ requestLearningV2AudioPrefetchV1 }) => {
          if (cancelled) return undefined;
          return requestLearningV2AudioPrefetchV1({
            targetLanguage: studyTarget,
            interfaceLocale: lang,
            lessonOrdinal: currentLessonOrdinal,
            sessionOrdinal: currentSessionOrdinal,
          });
        })
        .catch((error) => {
          if (cancelled) return;
          DebugLogger.error(
            "learning_v2:lesson_audio_pack_prepare",
            error instanceof Error ? error : new Error(String(error)),
            "warning",
          );
        });
    });
    return () => {
      cancelled = true;
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [
    currentLessonOrdinal,
    currentLearningV2SessionCoordinates?.sessionOrdinal,
    focusTick,
    learningV2ProgressHydrated,
    learningV2ProjectionScopeKey,
    lessonsRuntimeActive,
    page,
    studyTarget,
    lang,
  ]);

  // Кадр, на котором запланирован отложенный прогрев занятия (см. эффект ниже).
  const prewarmFrameRef = useRef<number | null>(null);
  const prewarmCurrentLearningV2SessionOnEntry = useCallback(() => {
    const current = currentLearningV2SessionCoordinates;
    if (!current) return;
    const courseSessionId = learningV2CourseSessionIdV1(
      current.lessonOrdinal,
      current.sessionOrdinal,
    );
    if (
      studyTarget === "en" &&
      !learningV2FactoryNativeSessionIds.has(courseSessionId)
    )
      return;
    void prewarmLearningV2SessionLaunch(
      current.lessonOrdinal,
      current.sessionOrdinal,
    ).catch((error) => {
      DebugLogger.error(
        "learning_v2:current_session_entry_prewarm",
        error instanceof Error ? error : new Error(String(error)),
        "warning",
      );
    });
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
    // Откладываем его за первый кадр: карта показывается сразу, подготовка
    // догоняет фоном. Ничего не теряем — занятие всё равно готовится задолго
    // до того, как человек успеет выбрать узел.
    if (
      learningV2FounderPassVisible ||
      learningV2FounderPassGate.revealCourse
    ) {
      let cancelled = false;
      // Два кадра: первый отдаёт карту на экран, второй запускает тяжёлое.
      const firstFrame = requestAnimationFrame(() => {
        const secondFrame = requestAnimationFrame(() => {
          if (cancelled) return;
          prewarmCurrentLearningV2SessionOnEntry();
        });
        prewarmFrameRef.current = secondFrame;
      });
      prewarmFrameRef.current = firstFrame;
      return () => {
        cancelled = true;
        if (prewarmFrameRef.current !== null) {
          cancelAnimationFrame(prewarmFrameRef.current);
          prewarmFrameRef.current = null;
        }
      };
    }
    return undefined;
  }, [
    learningV2FounderPassGate.revealCourse,
    learningV2FounderPassVisible,
    learningV2ProgressHydrated,
    lessonsRuntimeActive,
    page,
    prewarmCurrentLearningV2SessionOnEntry,
  ]);

  const handleLearningV2ExpandedLesson = useCallback(
    (lessonOrdinal: number | null) => {
      setExpandedLearningV2Lesson(lessonOrdinal);
      if (
        lessonOrdinal !== null &&
        currentLearningV2SessionCoordinates?.lessonOrdinal === lessonOrdinal
      ) {
        // Current session is always high priority. The prepared-promise cache
        // deduplicates this with the entry prewarm above.
        void prewarmLearningV2SessionLaunch(
          lessonOrdinal,
          currentLearningV2SessionCoordinates.sessionOrdinal,
        ).catch(() => undefined);
      }
    },
    [
      currentLearningV2SessionCoordinates,
      prewarmLearningV2SessionLaunch,
    ],
  );

  const handleLearningV2VisibleSessionsSettled = useCallback(
    (
      lessonOrdinal: number,
      sessions: readonly Readonly<{
        sessionOrdinal: number;
        state: LearningV2AccordionSessionStateV1;
      }>[],
    ) => {
      const available = sessions.filter((session) => {
        if (session.state !== "current" && session.state !== "completed")
          return false;
        return (
          studyTarget !== "en" ||
          learningV2FactoryNativeSessionIds.has(
            learningV2CourseSessionIdV1(
              lessonOrdinal,
              session.sessionOrdinal,
            ),
          )
        );
      });
      const current = available.find((session) => session.state === "current");
      if (current) {
        void prewarmLearningV2SessionLaunch(
          lessonOrdinal,
          current.sessionOrdinal,
        ).catch(() => undefined);
      }
      // зачем: было 7 повторов на КАЖДУЮ остановку прокрутки. При листании
      // карты это до 8 подготовок занятий подряд, каждая из которых грузит
      // материал сессии — прямой налог на скролл (аудит 20.09). Текущее
      // занятие прогреваем всегда (человек почти наверняка откроет его),
      // повторы — два ближайших: остальные всё равно вытеснятся из кэша
      // подготовок, который держит 8 записей.
      const repeats = available
        .filter((session) => session.state === "completed")
        .slice(0, 2);
      // This callback is fired only after drag/momentum settles. Repeats are
      // intentionally sequential so audio verification never competes with
      // the map's scroll frame budget.
      void (async () => {
        for (const session of repeats) {
          await prewarmLearningV2SessionLaunch(
            lessonOrdinal,
            session.sessionOrdinal,
          ).catch(() => undefined);
        }
      })();
    },
    [
      learningV2FactoryNativeSessionIds,
      prewarmLearningV2SessionLaunch,
      studyTarget,
    ],
  );

  const launchSelectedLearningV2Session = useCallback((skipIntro: boolean) => {
    const selected = selectedLearningV2Session;
    if (!selected || !selectedLearningV2PreparationKey) return;
    const launchRequest = ++learningV2ModalRequestRef.current;
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
        if (ready.handle) {
          // зачем: handle выдал сам ленивый модуль — он уже загружен, поэтому
          // передача идёт синхронно и не задерживает переход на экран занятия.
          const sessionClient = learningV2SessionClientV3Loaded;
          if (sessionClient) {
            sessionClient.stageLearningV2CourseSessionReadyHandoffV3(ready.handle);
          } else {
            // Немой отказ запрещён: без передачи экран занятия уйдёт в сеть за
            // тем, что уже готово локально.
            const readyHandle = ready.handle;
            DebugLogger.error(
              "learning_v2:ready_handoff_module_missing",
              new Error("handle есть, но модуль клиента сессии не загружен"),
              "warning",
            );
            void loadLearningV2SessionClientV3().then((mod) =>
              mod.stageLearningV2CourseSessionReadyHandoffV3(readyHandle),
            );
          }
        }
        setSelectedLearningV2Session(null);
        requestAnimationFrame(() => {
          router.push({
            pathname: "/learning-v2/session/[id]",
            params: {
              id: sessionId,
              runtimeMode: "direct_v1",
              previewMode:
                learningV2DevUnlockAllActive && studyTarget === "en"
                  ? "dev_unlocked_drafts_v1"
                  : undefined,
              previewOrigin: "course",
              lessonOrdinal: String(selected.lessonOrdinal),
              sessionOrdinal: String(selected.sessionOrdinal),
              releaseEnvironment:
                learningV2Catalog?.environment ?? "production",
              releaseSeasonId:
                learningV2Catalog?.seasonId ?? "learning-v2",
              runKind:
                selected.state === "completed" ? "repeat" : "initial",
              sessionRunId: ready.sessionRunId,
              skipIntro: skipIntro ? "1" : undefined,
            },
          } as never);
        });
      })
      .catch((error) => {
        if (learningV2ModalRequestRef.current !== launchRequest) return;
        setSelectedLearningV2Session(null);
        DebugLogger.error(
          "learning_v2:session_launch_prepare",
          error instanceof Error ? error : new Error(String(error)),
          "warning",
        );
      });
  }, [
    learningV2Catalog?.environment,
    learningV2Catalog?.seasonId,
    learningV2DevUnlockAllActive,
    learningV2ReduceMotionPreference,
    markLearningV2PreparedLaunchTrace,
    prepareLearningV2SessionLaunch,
    router,
    selectedLearningV2PreparationKey,
    selectedLearningV2Session,
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
  const showLearningV2DenialHint = useCallback(
    (text: string) => {
      clearLearningV2DenialHintTimers();
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
          () => setLearningV2DenialHint(null),
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
  const handleLearningV2SessionPress = useCallback(
    (
      selectedLesson: number,
      sessionOrdinal: number,
      state: LearningV2AccordionSessionStateV1,
    ) => {
      const selectedCourseSessionId = learningV2CourseSessionIdV1(
        selectedLesson,
        sessionOrdinal,
      );
      if (
        studyTarget === "en" &&
        !learningV2FactoryNativeSessionIds.has(selectedCourseSessionId)
      ) {
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
        showLearningV2DenialHint(
          currentOrdinal !== null
            ? triLang(lang, {
                ru: `Пройди сессию ${currentOrdinal}, чтобы открыть`,
                en: `Finish session ${currentOrdinal} to unlock`,
                uk: `Пройди сесію ${currentOrdinal}, щоб відкрити`,
                es: `Completa la sesión ${currentOrdinal} para desbloquear`,
                "pt-BR": `Conclua a sessão ${currentOrdinal} para desbloquear`,
                vi: `Hoàn thành buổi ${currentOrdinal} để mở khóa`,
                id: `Selesaikan sesi ${currentOrdinal} untuk membuka`,
                tr: `Kilidi açmak için ${currentOrdinal}. oturumu tamamla`,
                pl: `Ukończ sesję ${currentOrdinal}, aby odblokować`,
              })
            : triLang(lang, {
                ru: "Пока закрыто",
                en: "Still locked",
                uk: "Поки закрито",
                es: "Aún bloqueada",
                "pt-BR": "Ainda bloqueada",
                vi: "Chưa mở",
                id: "Masih terkunci",
                tr: "Şimdilik kilitli",
                pl: "Na razie zablokowana",
              }),
        );
        return;
      }
      const traceId = startLearningV2SessionLaunchTraceV1({
        courseSessionId: selectedCourseSessionId,
      });
      const request = ++learningV2ModalRequestRef.current;
      // Metadata is already in memory, so the modal mounts in this tap's
      // synchronous state update. Preparation is observed, never awaited here.
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
      lang,
      learningV2DevUnlockAllActive,
      learningV2Progress.currentSessionId,
      learningV2FactoryNativeSessionIds,
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
    if (page !== "lessons") {
      if (!isRetainedTab && initialPage === "v2") {
        safeRouterBack(router, HOME_BACK_FALLBACK as any);
        return;
      }
      setPage("lessons");
      return;
    }
    if (isRetainedTab) {
      goHome();
      return;
    }
    safeRouterBack(router, HOME_BACK_FALLBACK as any);
  }, [goHome, initialPage, isRetainedTab, page, router]);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let refreshInFlight = false;
      let refreshRequested = false;

      const clearEligibilityTimer = (): void => {
        if (timer === null) return;
        clearTimeout(timer);
        timer = null;
      };

      const scheduleEligibilityRefresh = (effectiveNowMs: number): void => {
        clearEligibilityTimer();
        if (!alive) return;
        const remainingMs = PERSONAL_PLAN_SUNSET_AT_MS - effectiveNowMs;
        if (remainingMs <= 0) return;
        timer = setTimeout(
          () => {
            void refreshEligibility();
          },
          Math.min(remainingMs, 60_000),
        );
      };

      const refreshEligibility = async (): Promise<void> => {
        if (!alive) return;
        if (refreshInFlight) {
          refreshRequested = true;
          return;
        }
        refreshInFlight = true;
        clearEligibilityTimer();
        let effectiveNowMs = Date.now();
        let shouldPoll = false;
        try {
          const state = await readAnyPersonalPlanState();
          const localAccess = resolvePersonalPlanSunsetAccess({
            hasOriginalFeatureAccess: true,
            savedState: state,
            nowMs: effectiveNowMs,
          });
          if (localAccess.status !== "allowed") {
            if (alive) setPersonalPlanSunsetTabVisible(false);
            return;
          }
          shouldPoll = true;
          effectiveNowMs = await readPersonalPlanSunsetEffectiveNow();
          if (!alive) return;
          const access = resolvePersonalPlanSunsetAccess({
            hasOriginalFeatureAccess: true,
            savedState: state,
            nowMs: effectiveNowMs,
          });
          const allowed = access.status === "allowed";
          shouldPoll = allowed;
          setPersonalPlanSunsetTabVisible(allowed);
        } catch {
          if (alive) setPersonalPlanSunsetTabVisible(false);
        } finally {
          refreshInFlight = false;
          if (!alive) return;
          if (refreshRequested) {
            refreshRequested = false;
            void refreshEligibility();
            return;
          }
          if (shouldPoll) scheduleEligibilityRefresh(effectiveNowMs);
        }
      };

      const requestEligibilityRefresh = (): void => {
        void refreshEligibility();
      };
      const subscriptions = [
        onAppEvent("personal_plan_updated", requestEligibilityRefresh),
        onAppEvent("cloud_profile_hydrated", requestEligibilityRefresh),
        onAppEvent("auth_provider_linked", requestEligibilityRefresh),
        onAppEvent("account_deleted", requestEligibilityRefresh),
      ];
      setPersonalPlanSunsetTabVisible(false);
      void refreshEligibility();
      return () => {
        alive = false;
        clearEligibilityTimer();
        for (const subscription of subscriptions) subscription.remove();
      };
    }, []),
  );
  const openLearningRoute = useCallback(() => {
    hapticTap();
    if (!personalPlanSunsetTabVisible) return;
    void (async () => {
      try {
        const state = await readAnyPersonalPlanState();
        const effectiveNowMs = await readPersonalPlanSunsetEffectiveNow();
        const access = resolvePersonalPlanSunsetAccess({
          hasOriginalFeatureAccess: true,
          savedState: state,
          nowMs: effectiveNowMs,
        });
        if (access.status !== "allowed") {
          setPersonalPlanSunsetTabVisible(false);
          return;
        }
        // зачем (владелец 2026-08-24): раньше отсутствие плана прятало вкладку
        // прямо по тапу — раздел «исчезал». В dev-обходе плана у разработчика
        // нет никогда, поэтому ведём на создание плана вместо скрытия.
        if (!state) {
          if (isPersonalPlanDevBypassActive()) {
            router.push("/personal_plan_setup" as never);
            return;
          }
          setPersonalPlanSunsetTabVisible(false);
          return;
        }
        const premiumProbe = resolvePersonalPlanPremiumProbe({
          mode: "premium-required",
          accessResolved,
          featureRequiresPremium: personalPlanFeatureRequiresPremium,
          featureAccess: planAccess,
        });
        // зачем: та же правка, что в personal_plan_sunset_guard — в dev-обходе
        // премиум СЧИТАЕТСЯ подтверждённым. Пропуск одной лишь сетевой проверки
        // оставлял verifiedPlanAccess=false и уводил на пейвол.
        let verifiedPlanAccess =
          premiumProbe === "allowed" || isPersonalPlanDevBypassActive();
        if (!verifiedPlanAccess) {
          invalidatePremiumCache();
          verifiedPlanAccess = await getVerifiedPremiumAccessStatus().catch(
            () => false,
          );
        }
        const decisionNowMs = await readPersonalPlanSunsetEffectiveNow();
        const finalAccess = resolvePersonalPlanSunsetAccess({
          hasOriginalFeatureAccess: true,
          savedState: state,
          nowMs: decisionNowMs,
        });
        if (finalAccess.status !== "allowed") {
          setPersonalPlanSunsetTabVisible(false);
          return;
        }
        if (!verifiedPlanAccess) {
          redirectRetiredPersonalPlan(router);
          return;
        }
        router.push(
          (state.status === "completed"
            ? "/personal_plan_complete"
            : "/personal_plan") as any,
        );
      } catch {
        setPersonalPlanSunsetTabVisible(false);
      }
    })();
  }, [
    accessResolved,
    personalPlanFeatureRequiresPremium,
    personalPlanSunsetTabVisible,
    planAccess,
    router,
  ]);
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

  // ── Открыть урок за жемчужины (владелец 2026-09-17) ──────────────────────
  // Баланс нужен, чтобы кнопка честно говорила «не хватает», а не роняла
  // покупку после тапа. Читаем лениво — только когда шторка замка открыта.
  const [pearlBalance, setPearlBalance] = useState<number | null>(null);
  const [lessonUnlockPending, setLessonUnlockPending] = useState(false);
  // Номер урока, который празднуем. В памяти экрана, не durable: пропущенная
  // анимация не должна всплыть когда-нибудь потом (правило владельца).
  const [celebratingLesson, setCelebratingLesson] = useState<number | null>(null);
  useEffect(() => {
    if (gateModalKind !== "lesson" && gateModalKind !== "levelGate") return;
    let alive = true;
    void getShardsBalance().then(
      (balance) => { if (alive) setPearlBalance(balance); },
      (error: unknown) => {
        // Немой catch запрещён: без баланса кнопка покупки должна остаться
        // рабочей (сервер сам откажет), а причина — попасть в лог.
        console.warn('[LESSON-UNLOCK] balance:read_failed', String(error));
        if (alive) setPearlBalance(null);
      },
    );
    const sub = onAppEvent('shards_balance_updated', (payload) => {
      const b = (payload as { balance?: number } | undefined)?.balance;
      if (alive && typeof b === 'number' && Number.isFinite(b)) {
        setPearlBalance(Math.max(0, Math.floor(b)));
      }
    });
    return () => { alive = false; sub.remove(); };
  }, [gateModalKind]);

  const buyLessonUnlock = useCallback(async (lessonNum: number) => {
    // Покупка урока за жемчужины — дополнительный путь только внутри Plus.
    // Free-пользователь всегда должен увидеть обычный Plus-paywall.
    if (!isPremium) {
      setGateModal(null);
      const doneSoFar = scores.filter((score) => score > 0).length;
      openPremiumPaywall(router, {
        context: lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap),
        lessons_done: doneSoFar,
        ...lessonPurchaseContinuationParams(lessonNum),
      });
      return;
    }
    // Защита от двойного тапа: второй тап не уходит в покупку вовсе.
    if (lessonUnlockPending) {
      if (__DEV__) console.log('[LESSON-UNLOCK] press:ignored_pending', JSON.stringify({ lessonNum }));
      return;
    }
    hapticTap();
    // зачем: баланс уже известен и его не хватает — не устраиваем мигание
    // «открылось и закрылось». Отказываем сразу, до всякой оптимистики.
    if (pearlBalance !== null && pearlBalance < LESSON_PEARL_UNLOCK_PRICE) {
      if (__DEV__) console.log('[LESSON-UNLOCK] press:insufficient_local', JSON.stringify({ lessonNum, pearlBalance }));
      Alert.alert('', triLang(lang, {
        ru: `Не хватает жемчужин. Нужно ${LESSON_PEARL_UNLOCK_PRICE}, у тебя ${pearlBalance}.`,
        en: `Not enough pearls. You need ${LESSON_PEARL_UNLOCK_PRICE}, you have ${pearlBalance}.`,
        uk: `Не вистачає перлин. Потрібно ${LESSON_PEARL_UNLOCK_PRICE}, у тебе ${pearlBalance}.`,
        es: `No tienes suficientes perlas. Necesitas ${LESSON_PEARL_UNLOCK_PRICE} y tienes ${pearlBalance}.`,
        "pt-BR": `Pérolas insuficientes. Você precisa de ${LESSON_PEARL_UNLOCK_PRICE} e tem ${pearlBalance}.`,
        vi: `Không đủ ngọc trai. Bạn cần ${LESSON_PEARL_UNLOCK_PRICE}, hiện có ${pearlBalance}.`,
        id: `Mutiara tidak cukup. Butuh ${LESSON_PEARL_UNLOCK_PRICE}, kamu punya ${pearlBalance}.`,
        tr: `Yeterli inci yok. ${LESSON_PEARL_UNLOCK_PRICE} gerekiyor, sende ${pearlBalance} var.`,
        pl: `Za mało pereł. Potrzebujesz ${LESSON_PEARL_UNLOCK_PRICE}, masz ${pearlBalance}.`,
      }));
      return;
    }
    setLessonUnlockPending(true);
    // Optimistic UI: карточка открывается СРАЗУ, сеть/диск догоняют фоном.
    setPurchasedLessons((prev) =>
      prev.includes(lessonNum) ? prev : [...prev, lessonNum].sort((a, b) => a - b),
    );
    setGateModal(null);
    try {
      const result = await buyLessonWithPearls({ lessonId: lessonNum, studyTarget });
      if (!result.ok) {
        // Откат: покупка не прошла — карточка обязана снова закрыться.
        setPurchasedLessons((prev) => prev.filter((id) => id !== lessonNum));
        const message = result.reason === 'insufficient_shards'
          ? triLang(lang, {
              ru: `Не хватает жемчужин. Нужно ${LESSON_PEARL_UNLOCK_PRICE}.`,
              en: `Not enough pearls. You need ${LESSON_PEARL_UNLOCK_PRICE}.`,
              uk: `Не вистачає перлин. Потрібно ${LESSON_PEARL_UNLOCK_PRICE}.`,
              es: `No tienes suficientes perlas. Necesitas ${LESSON_PEARL_UNLOCK_PRICE}.`,
              "pt-BR": `Pérolas insuficientes. Você precisa de ${LESSON_PEARL_UNLOCK_PRICE}.`,
              vi: `Không đủ ngọc trai. Bạn cần ${LESSON_PEARL_UNLOCK_PRICE}.`,
              id: `Mutiara tidak cukup. Butuh ${LESSON_PEARL_UNLOCK_PRICE}.`,
              tr: `Yeterli inci yok. ${LESSON_PEARL_UNLOCK_PRICE} gerekiyor.`,
              pl: `Za mało pereł. Potrzebujesz ${LESSON_PEARL_UNLOCK_PRICE}.`,
            })
          : triLang(lang, {
              ru: "Не получилось открыть урок. Попробуй ещё раз.",
              en: "Could not unlock the lesson. Please try again.",
              uk: "Не вдалося відкрити урок. Спробуй ще раз.",
              es: "No se pudo desbloquear la lección. Inténtalo de nuevo.",
              "pt-BR": "Não foi possível desbloquear a lição. Tente novamente.",
              vi: "Không thể mở bài học. Hãy thử lại.",
              id: "Gagal membuka pelajaran. Coba lagi.",
              tr: "Ders açılamadı. Tekrar dene.",
              pl: "Nie udało się odblokować lekcji. Spróbuj ponownie.",
            });
        console.warn('[LESSON-UNLOCK] press:failed', JSON.stringify({ lessonNum, reason: result.reason }));
        Alert.alert('', message);
        return;
      }
      if (__DEV__) console.log('[LESSON-UNLOCK] press:ok', JSON.stringify({ lessonNum, already: result.alreadyOwned }));
      void prefetchLessonMenuCache(lessonNum, studyTarget);
      /**
       * Празднуем ТОЛЬКО первую покупку урока (владелец 21.09). Повторный тап
       * или возврат на экран (`alreadyOwned`) праздника не получает.
       *
       * Урок уже открыт ВЫШЕ, до показа: празднование ничего не выдаёт и
       * ничего не держит — правило «празднование не ставится в durable-очередь».
       */
      if (result.alreadyOwned) {
        router.push({ pathname: "/lesson_menu", params: { id: lessonNum } });
        return;
      }
      console.log('[LESSON-UNLOCK] celebrate', JSON.stringify({ lessonNum })); // guard-ok: ветка решения обязана логироваться и в релизе
      setCelebratingLesson(lessonNum);
    } finally {
      setLessonUnlockPending(false);
    }
  }, [
    effectiveLegacyFreeLessonCap,
    isPremium,
    lang,
    lessonUnlockPending,
    pearlBalance,
    router,
    scores,
    studyTarget,
  ]);
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
  const lessons = useMemo(() => {
    const fallback = lessonNamesForStudyTarget(lang, studyTarget);
    // System currently owns one exact reviewed title set. Keep it intact for
    // every interface locale until owner-reviewed title translations exist;
    // generated fallback labels such as “English · Lesson 1” are forbidden.
    if (page === "v2" && studyTarget === "en") return LEARNING_V2_OWNER_EN_TITLES_RU;
    if (page !== "v2" || !learningV2Catalog) return fallback;
    return fallback.map(
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
    if (effectiveDevContentUnlock || effectiveNoLimits)
      return new Array(32).fill(true);
    const u = new Array(32).fill(false);
    // Зачёты уровней — они открывают уроки на границах 9/19/29.
    const passedExams: Record<string, boolean> = {};
    for (const [lvl, res] of Object.entries(examResults)) {
      if (res?.passed) passedExams[lvl] = true;
    }
    if (isPremium) return buildPremiumLessonUnlocks({ scores, purchasedLessons, lessonCount: u.length });
    return buildSequentialFreeLessonUnlocks({
      scores,
      persistedUnlocked,
      purchasedLessons,
      passedExams,
      lessonCount: u.length,
      legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
    });
  }, [
    effectiveDevContentUnlock,
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
          color: bookPalette(num, themeMode),
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
  }, [lang, lessons, page, themeMode]);
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
      return listData.filter((item) => {
        if (item.kind !== "lesson") return false;
        const lessonNumber = item.index + 1;
        return (
          item.name.toLocaleLowerCase().includes(query)
          || String(lessonNumber) === query
        );
      });
    }
    const [firstLesson, lastLesson] =
      COURSE_LEVEL_RANGES[legacySelectedLevel];
    return listData.filter((item) => {
      if (item.kind === "lesson") {
        const lessonNumber = item.index + 1;
        return lessonNumber >= firstLesson && lessonNumber <= lastLesson;
      }
      if (item.kind === "exam") return item.level === legacySelectedLevel;
      if (item.kind === "attestation") return legacySelectedLevel === "B2";
      return false;
    });
  }, [legacyLessonQuery, legacySelectedLevel, listData]);
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
    setLegacySelectedLevel(getCourseLevelForLesson(currentLessonNum ?? 1));
    setPage("lessons");
  }, [currentLessonNum]);
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
    void requestLegacyLessonsIntro();
  }, [requestLegacyLessonsIntro]);
  // зачем: чип «Новые уроки» остаётся на экране как обещание будущего, но пока
  // курс не дописан он недоступен. Ответ на тап — строка под чипом, мгновенно и
  // локально (никакой сети, никакого модала поверх урока). Мягкий хаптик, чтобы
  // тап не выглядел «проваленным»: человек чувствует, что кнопка его услышала.
  const [learningV2LockedNoticeVisible, setLearningV2LockedNoticeVisible] =
    useState(false);
  // зачем: владелец 2026-09-13 — «в релизе оно не должно называться старые уроки,
  // а просто "Уроки"». Для человека это единственный курс, слово «старые» его
  // только смущает. В дев-сборке оставляем «Старые уроки»: там рядом живёт
  // страница нового курса, и их надо различать.
  const legacyLessonsScreenTitle = LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY
    ? triLang(lang, {
        ru: "Старые уроки",
        en: "Classic lessons",
        uk: "Старі уроки",
        es: "Lecciones clásicas",
        "pt-BR": "Lições clássicas",
        vi: "Bài học cũ",
        id: "Pelajaran klasik",
        tr: "Klasik dersler",
        pl: "Klasyczne lekcje",
      })
    : triLang(lang, {
        ru: "Уроки",
        en: "Lessons",
        uk: "Уроки",
        es: "Lecciones",
        "pt-BR": "Lições",
        vi: "Bài học",
        id: "Pelajaran",
        tr: "Dersler",
        pl: "Lekcje",
      });
  const openNewLessons = useCallback(() => {
    if (!LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY) {
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
      console.log("[V2-OPEN] tap", JSON.stringify({ from: "openNewLessons" }));
    }
    setPage("v2");
  }, []);
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
    router.push('/combined_lesson_pick');
  }, [isPremium, router]);
  const selectLegacyLevel = useCallback((level: CourseLevel) => {
    setLegacySelectedLevel(level);
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);
  // зачем: на узком экране ряд не влезает целиком и листается. Без подкрутки
  // человек с уровнем B2 открывал экран и своего уровня НЕ ВИДЕЛ — он оставался
  // за правым краем (скриншот владельца 2026-09-17). Доводим активный чип в зону
  // видимости один раз при появлении рельсы: измерять каждый чип дорого и не
  // нужно — ширина чипа стабильна (52 + зазор 6), смещение считаем по индексу.
  //
  // ВАЖНО (2026-09-17): после переноса «Новых уроков» ВНУТРЬ рельсы нельзя
  // звать scrollToEnd — конец ряда это теперь чип «Новые уроки», и B2 снова
  // остался бы за краем. Скроллим на вычисленную позицию самого уровня.
  const legacyLevelRailRef = useRef<ScrollView | null>(null);
  // Что уже доводили: храним сам уровень, а не голое «да/нет». Иначе после
  // ручного выбора A1 повторный заход на экран не вернул бы рельсу на место.
  const legacyLevelRailRevealedForRef = useRef<CourseLevel | null>(null);
  const revealSelectedLegacyLevel = useCallback(() => {
    const level = legacySelectedLevel;
    if (legacyLevelRailRevealedForRef.current === level) return;
    const index = COURSE_LEVELS.indexOf(level);
    if (index < 0) {
      // Немой выход запрещён: уровень вне каталога — это рассинхрон данных.
      // В релизе молчим: подкрутка рельсы не стоит работы на горячем пути.
      if (__DEV__) {
        console.warn(
          `[LESSONS-RAIL] уровень вне COURSE_LEVELS, подкрутка пропущена: ${String(level)}`,
        );
      }
      return;
    }
    legacyLevelRailRevealedForRef.current = level;
    // Первые два уровня и так видны от левого края — не дёргаем рельсу зря.
    if (index <= 1) return;
    // Чип уровня: ширина 52 + зазор 6. Доводим его левый край почти к началу
    // рельсы (минус один чип слева как «контекст», что ряд листается назад).
    const CHIP_STEP = 58;
    legacyLevelRailRef.current?.scrollTo?.({
      x: Math.max(0, (index - 1) * CHIP_STEP),
      animated: false,
    });
  }, [legacySelectedLevel]);
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
    },
    [bouncyStretch],
  );
  // Премиум-урок: открываем пейвол СРАЗУ, без промежуточного окна «урок входит в премиум».
  // (Раньше тап показывал ThemedChoiceModal с кнопкой «Получить Premium» — лишний шаг.)
  const openLessonPaywall = useCallback(
    (lessonNum: number) => {
      const doneSoFar = scores.filter((score) => score > 0).length;
      openPremiumPaywall(router, {
        context: lessonPaywallContext(lessonNum, effectiveLegacyFreeLessonCap),
        lessons_done: doneSoFar,
        ...lessonPurchaseContinuationParams(lessonNum),
      });
    },
    [effectiveLegacyFreeLessonCap, router, scores],
  );
  // ── Exam card: рендерится внутри своей главы, визуал без изменений ──
  const renderExamCard = (lvl: string): React.ReactNode => {
    const themeExamMeta = EXAM_META_BY_THEME[themeMode] ?? EXAM_META_SKETCH;
    const sketchMeta = themeExamMeta[lvl];
    const goldLevel = goldCefrAccent(lvl);
    const meta = isGoldTheme
      ? { bg: goldSurface, accent: goldLevel.accent }
      : sketchMeta;
    const [from, to] =
      lvl === "A1"
        ? [1, 8]
        : lvl === "A2"
          ? [9, 18]
          : lvl === "B1"
            ? [19, 28]
            : [29, 32];
    const scoreReady = scores.slice(from - 1, to).every((s) => s >= 4.5);
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
    const examMedal = getExamMedalTier(
      Math.max(currentTargetStateBestPct, overlayBestPct),
    );
    const examPass = examPassCounts[lvl] ?? 0;
    const examDots = getEarnedDots(examMedal, examPass);
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
    const subLine = result
      ? result.passed
        ? triLang(lang, {
            ru: `✅ Сдан — ${result.pct}%`,
            en: `✅ Passed — ${result.pct}%`,
            uk: `✅ Здано — ${result.pct}%`,
            es: `✅ Superado — ${result.pct}%`,
            "pt-BR": `✅ Aprovado — ${result.pct}%`,
            vi: `✅ Đã vượt qua — ${result.pct}%`,
            id: `✅ Lulus — ${result.pct}%`,
            tr: `✅ Geçildi — ${result.pct}%`,
            pl: `✅ Zdane — ${result.pct}%`,
          })
        // зачем (аудит по Библии, 2026-08-26): голый крестик с процентом бил
        // по несдавшему (Часть V п.6). Рядом стоит «✅ Сдано» — держим тот же
        // тон: называем результат без приговора и зовём вернуться.
        : triLang(lang, {
            ru: `Почти — ${result.pct}%`, uk: `Майже — ${result.pct}%`, en: `Almost — ${result.pct}%`,
            es: `Casi — ${result.pct}%`, 'pt-BR': `Quase — ${result.pct}%`, vi: `Suýt rồi — ${result.pct}%`,
            id: `Hampir — ${result.pct}%`, tr: `Az kaldı — ${result.pct}%`, pl: `Prawie — ${result.pct}%`,
          })
      : !examSourceAvailable
        ? frenchExamGateCopy("level", lang).title
        : allDone
          ? triLang(lang, {
              ru: "Нажми чтобы начать",
              en: "Tap to start",
              uk: "Натисни щоб почати",
              es: "Toca para empezar",
              "pt-BR": "Toque para começar",
              vi: "Nhấn để bắt đầu",
              id: "Ketuk untuk mulai",
              tr: "Başlamak için dokun",
              pl: "Dotknij, aby rozpocząć",
            })
          : examPremiumRequired
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
            : isPremium && prevExamLevel
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
              : triLang(lang, {
                  ru: `Заверши все уроки ${lvl} на 4.5+`,
                  en: `Complete all ${lvl} lessons with 4.5+`,
                  uk: `Завершіть усі уроки ${lvl} на 4.5+`,
                  es: `Completa todas las lecciones de ${lvl} con nota mínima de 4,5`,
                  "pt-BR": `Conclua todas as lições ${lvl} com 4,5+`,
                  vi: `Hoàn thành tất cả bài học ${lvl} với 4.5+`,
                  id: `Selesaikan semua pelajaran ${lvl} dengan 4,5+`,
                  tr: `${lvl} seviyesindeki tüm dersleri 4.5+ ile tamamla`,
                  pl: `Ukończ wszystkie lekcje ${lvl} na 4,5+`,
                });
    return (
      <Animated.View
        key={`e-${lvl}`}
        style={{
          marginTop: 8,
          transform: [{ scale: 1 }],
          ...(isGoldTheme ? goldShadow(allDone ? 2 : 1) : {}),
          ...{},
        }}
      >
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => {
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
          }}
          style={{
            minHeight: 78,
            marginHorizontal: isGoldTheme ? 14 : 0,
            borderRadius: isGoldTheme ? 14 : 0,
            borderWidth: isGoldTheme ? 1 : 0,
            borderColor: isGoldTheme
              ? allDone
                ? GOLD_RICH.hairlineStrong
                : GOLD_RICH.hairlineQuiet
              : "transparent",
            flexDirection: "row",
            backgroundColor: meta.bg,
            opacity: allDone ? 1 : isPremium ? 0.38 : 0.5,
            overflow: "hidden",
          }}
        >
          {isGoldTheme && (
            <LinearGradient
              colors={allDone ? goldLevel.card : goldCardGradient("muted")}
              locations={GOLD_SURFACE_LOCATIONS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            />
          )}
          {false}
          {false}
          {isGoldTheme && (
            <GoldBevel radius={14} intensity={allDone ? "strong" : "quiet"} />
          )}
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 20,
              gap: 4,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: isGoldTheme ? 1 : 1.5,
                backgroundColor: isGoldTheme
                  ? GOLD_RICH.hairlineStrong
                  : meta.accent + "30",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: isGoldTheme ? 1 : 1.5,
                backgroundColor: isGoldTheme
                  ? GOLD_RICH.hairlineDark
                  : meta.accent + "30",
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {result?.passed ? (
                <Ionicons
                  name="checkmark-circle"
                  size={isB2 ? 26 : 22}
                  color={meta.accent}
                />
              ) : allDone || isPremium ? (
                <LessonExamThemeIcon
                  themeMode={themeMode}
                  size={isB2 ? 34 : 30}
                  label={label}
                />
              ) : (
                <Ionicons
                  name="lock-closed-outline"
                  size={isB2 ? 26 : 22}
                  color={meta.accent}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: meta.accent,
                    fontSize: isB2 ? f.h2 : f.bodyLg,
                    fontWeight: "800",
                  }}
                  maxFontSizeMultiplier={1}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    color: meta.accent + "AA",
                    fontSize: f.sub,
                    marginTop: 1,
                  }}
                  maxFontSizeMultiplier={1}
                >
                  {subLine}
                </Text>
              </View>
              {examDots.length > 0 && <MedalDots dots={examDots} />}
              {allDone && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={meta.accent + "80"}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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
    const isUnlocked = page === "v2" ? learningV2Available : unlockedLessons[index];
    const bg = page === "v2" && !learningV2Available
      ? isLightThemeMode(themeMode) ? "#B5BABD" : "#555960"
      : page === "v2" && learningV2InProgress
        ? darkenHexCached(bookPalette(num, themeMode), 0.1)
        : bookPalette(num, themeMode);
    const darkBg = darkenHexCached(bg, 0.42);
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
      : darkenHexCached(bg, 0.28);
    const cardLayerStyle = {
      position: "absolute" as const,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      borderRadius: cardRadius,
      overflow: "hidden" as const,
    };
    const lessonTextColor = isSagePorcelainTheme
      ? t.textPrimary
      : isGoldTheme
        ? isUnlocked
          ? t.textPrimary
          : "rgba(247,241,228,0.44)"
        : !isUnlocked
          ? levelLockedByExam
            ? "rgba(255,255,255,0.42)"
            : "rgba(255,255,255,0.35)"
          : "rgba(255,255,255,0.97)";
    const lessonMetaColor = isSagePorcelainTheme
      ? t.textPrimary
      : isGoldTheme
        ? isUnlocked
          ? t.textMuted
          : "rgba(184,173,146,0.36)"
        : !isUnlocked
          ? levelLockedByExam
            ? "rgba(255,255,255,0.30)"
            : "rgba(255,255,255,0.30)"
          : // зачем (аудит-фикс): было LESSON_CARD_OPEN_META_TEXT (#07110A, тёмный) —
            // на разблокированной незалитой карточке фон здесь ВСЕГДА тёмный градиент
            // (см. lessonTextColor выше, тот же случай даёт rgba(255,255,255,0.97)).
            // Тёмный текст без тени на тёмном фоне давал контраст ~1:1.
            "rgba(255,255,255,0.97)";
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
        onLearningV2Press={onLearningV2PressOverride ? () => onLearningV2PressOverride() : toggleLearningV2Lesson}
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
        setLearningV2DevUnlockAllRequested((current) => !current);
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
  const learningV2ResourceHud = <View testID="learning-v2-resource-hud" style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 0 }}>
              {learningV2DevUnlockControl}
              {expandedLearningV2Lesson !== null ? (
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
                  <Ionicons name="book-outline" size={21} color={t.accent} />
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
                          color: t.correctText,
                          fontSize: 9,
                          lineHeight: 11,
                          fontWeight: "900",
                        }}
                      >
                        {Math.min(99, learningV2DictionaryWords.length)}
                      </Text>
                    </View>
                  ) : null}
                </PressableHybrid>
              ) : null}
              <View
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
      <View
        collapsable={false}
        style={{
          backgroundColor: t.bgCard,
          borderRadius: 999,
          paddingHorizontal: 7,
        }}
      >
        <RuneBalanceChip
          testID="legacy-lessons-rune-balance"
          color={t.textPrimary}
          active={lessonsRuntimeActive && page === "lessons"}
          size={22}
        />
      </View>
      <EnergyBar
        size={24}
        maxWidth={88}
        ownerActive={lessonsRuntimeActive && page === "lessons"}
        compact
      />
    </View>
  );

  return (
    <>
      <ScreenGradient forceFullBleed>
        <View style={{ flex: 1, backgroundColor: page === "dialogs" ? "transparent" : t.bgPrimary }}>
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
              <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
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
                        "Dev: язык обучения",
                        "Испанский/французский доступны только при русском или украинском языке интерфейса. Смените язык интерфейса в настройках, чтобы переключить сюда.",
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
                    accessibilityLabel="Dev: switch study target language"
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
                    <Ionicons name="language-outline" size={14} color={t.gold} />
                    <Text
                      style={{
                        color: t.textPrimary,
                        fontSize: 14,
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
              borderBottomWidth: 1,
              borderBottomColor: t.border,
              marginBottom: 2,
            }}
          >
            <TabUnderlineButton
              label={s.tabs.lessons}
              active={page === "lessons"}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              themeMode={themeMode}
              onPress={() => {
                if (page !== "lessons") {
                  hapticTap();
                  setPage("lessons");
                }
              }}
            />
            {personalPlanSunsetTabVisible ? (
              <TabUnderlineButton
                label={triLang(lang, {
                  ru: "Маршрут",
                  en: "Route",
                  uk: "Маршрут",
                  es: "Ruta",
                  "pt-BR": "Rota",
                  vi: "Lộ trình",
                  id: "Rute",
                  tr: "Rota",
                  pl: "Trasa",
                })}
                active={false}
                color={t.textPrimary}
                mutedColor={t.textMuted}
                accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
                fontSize={f.body}
                themeMode={themeMode}
                plusBadge={
                  personalPlanFeatureRequiresPremium &&
                  (!accessResolved || !planAccess)
                }
                plusBadgeLabel="Plus"
                onPress={openLearningRoute}
              />
            ) : null}
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
                active={page === "dialogs"}
                color={t.textPrimary}
                mutedColor={t.textMuted}
                accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
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
            {(
              <TabUnderlineButton
                label="V2"
                active={page === "v2"}
                color={t.textPrimary}
                mutedColor={t.textMuted}
                accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
                fontSize={f.body}
                themeMode={themeMode}
                onPress={() => {
                  if (page !== "v2") {
                    hapticTap();
                    if (__DEV__) {
                      (globalThis as { __v2OpenT0?: number }).__v2OpenT0 = Date.now();
                      console.log("[V2-OPEN] tap", JSON.stringify({ from: "tab_v2" }));
                    }
                    setPage("v2");
                  }
                }}
              />
            )}
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
        >
          {page === "v2" ? (
            // зачем: владелец 20.09 — «открываем раздел, запускается анимация
            // которая была прописана при входе, это всё, никаких морганий».
            // Здесь стояло условие learningV2FounderPassGate.revealCourse, а
            // в ветке else — пустая заглушка. Пока чек о показе модала читался
            // с диска, человек видел пустой экран; когда чек приходил, карта
            // монтировалась ЗАНОВО и вступление играло второй раз. Карта
            // теперь рисуется сразу и живёт, пока раздел открыт; модал лежит
            // поверх неё.
            <LearningV2PulseCourse
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
              navigationControl={
                <PressableHybrid
                  testID="learning-v2-back-home"
                  accessibilityLabel={triLang(lang, { ru: "Назад", en: "Back", uk: "Назад", es: "Atrás", "pt-BR": "Voltar", vi: "Quay lại", id: "Kembali", tr: "Geri", pl: "Wstecz" })}
                  onPress={handleLessonsBack}
                  variant="icon"
                  style={{ width: 44, height: 44 }}
                  contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="chevron-back" size={23} color={t.textPrimary} />
                </PressableHybrid>
              }
              titles={lessons}
              lang={lang}
              legacyLessonsLabel={triLang(lang, { ru: "Старые уроки", en: "Classic lessons", uk: "Старі уроки", es: "Lecciones clásicas", "pt-BR": "Lições clássicas", vi: "Bài học cũ", id: "Pelajaran klasik", tr: "Klasik dersler", pl: "Klasyczne lekcje" })}
              onLegacyLessons={requestLegacyLessons}
              preparedProgress={learningV2PreparedProgress}
              currentSessionId={learningV2Progress.currentSessionId}
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
            style={{ flex: 1, backgroundColor: t.bgPrimary }}
          >
            <View
              style={{
                paddingTop: headerTopPad,
                paddingHorizontal: 12,
                paddingBottom: 8,
              }}
            >
              <View
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
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
                    borderRadius: 18,
                    backgroundColor: t.bgCard,
                  }}
                  contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={23}
                    color={t.textPrimary}
                  />
                </PressableHybrid>
                <Text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: t.textPrimary,
                    fontSize: 21,
                    lineHeight: 25,
                    fontWeight: "700",
                    letterSpacing: -0.35,
                  }}
                >
                  {legacyLessonsScreenTitle}
                </Text>
                {legacyLessonsResourceHud}
              </View>
            </View>

            {/* Поле поиска живёт НАД рядом чипов в своём слоте: ряд остаётся
                ровно на месте, интерфейс не разъезжается (требование владельца). */}
            {legacySearchOpen ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 10,
                  height: 46,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 14,
                  backgroundColor: t.bgCard,
                }}
              >
                <Ionicons name="search" size={18} color={t.textGhost} />
                <TextInput
                  testID="legacy-lessons-search-input"
                  value={legacyLessonQuery}
                  onChangeText={setLegacyLessonQuery}
                  autoFocus
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
                  placeholderTextColor={t.textGhost}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: t.textPrimary,
                    fontSize: 15,
                    fontWeight: "600",
                    padding: 0,
                  }}
                />
                <TouchableOpacity
                  testID="legacy-lessons-search-close"
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, {
                    ru: "Закрыть поиск", uk: "Закрити пошук", en: "Close search",
                    es: "Cerrar búsqueda", "pt-BR": "Fechar busca", vi: "Đóng tìm kiếm",
                    id: "Tutup pencarian", tr: "Aramayı kapat", pl: "Zamknij wyszukiwanie",
                  })}
                  hitSlop={10}
                  onPress={() => {
                    hapticTap();
                    setLegacyLessonQuery("");
                    setLegacySearchOpen(false);
                  }}
                >
                  <Ionicons name="close" size={18} color={t.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 8,
                paddingBottom: 8,
              }}
            >
              {/* Лупа — ЧЛЕН ряда, а не гость: та же высота 44 и радиус 15,
                  что у чипов уровней. Появляется всегда: список уроков длинный
                  (32 урока), искать по нему глазами дорого. */}
              <TouchableOpacity
                testID="legacy-lessons-search-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: legacySearchOpen }}
                accessibilityLabel={triLang(lang, {
                  ru: "Поиск по урокам", uk: "Пошук за уроками", en: "Search lessons",
                  es: "Buscar lecciones", "pt-BR": "Buscar lições", vi: "Tìm bài học",
                  id: "Cari pelajaran", tr: "Derslerde ara", pl: "Szukaj lekcji",
                })}
                onPress={() => {
                  hapticTap();
                  setLegacySearchOpen((prev) => {
                    // Закрываем — снимаем и фильтр: иначе список остался бы
                    // урезанным без единого видимого признака почему.
                    if (prev) setLegacyLessonQuery("");
                    return !prev;
                  });
                }}
                style={{
                  width: 46,
                  height: 44,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: legacySearchOpen ? t.accent : t.bgCard,
                }}
              >
                <Ionicons
                  name="search"
                  size={18}
                  color={legacySearchOpen ? t.correctText : t.textSecond}
                />
              </TouchableOpacity>

              {/* ОДИН РЯД ЦЕЛИКОМ (владелец 2026-09-17: «это один ряд весь»).
                  Внутри прокрутки живут ВСЕ элементы: A1 A2 B1 B2, COMBO и
                  «Новые уроки». Раньше чип «Новые уроки» стоял СОСЕДОМ рельсы и
                  забирал до 150pt фиксированной ширины — уровням оставалось
                  ~180pt на экране 360pt, и B2 срезало пополам (скриншот
                  владельца). Теперь ширину никто не делит: ряд просто листается,
                  а затухание справа показывает, что продолжение есть. Обводок
                  нет нигде — граница только тоном, это запрет владельца.

                  ПО ВЕРТИКАЛИ: PressableHybrid ставит alignSelf:'stretch' ПЕРЕД
                  пользовательским стилем. Чип, перебивавший это на 'center',
                  внутри горизонтального ScrollView схлопывался по высоте. Поэтому
                  alignSelf у чипов не задаём — выравнивает контейнер прокрутки. */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <ScrollView
                  horizontal
                  ref={legacyLevelRailRef}
                  testID="legacy-lessons-level-rail"
                  showsHorizontalScrollIndicator={false}
                  // зачем: доводим активный уровень в зону видимости ровно один
                  // раз, когда рельса уже знает свою ширину. onLayout срабатывает
                  // до первой отрисовки для пользователя, поэтому прыжка не видно.
                  onContentSizeChange={revealSelectedLegacyLevel}
                  // зачем: рельса обязана иметь свою высоту ДО замера контента —
                  // иначе первый кадр прыгает (правило стабильности раскладки).
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    // зачем: место под затухание, чтобы последний чип
                    // докручивался целиком и не жил под градиентом.
                    paddingRight: 18,
                  }}
                >
                  {COURSE_LEVELS.map((level) => {
                    const selected = legacySelectedLevel === level;
                    return (
                      <PressableHybrid
                        key={level}
                        testID={`legacy-lessons-level-${level}`}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={triLang(lang, {
                          ru: `Уровень ${level}`,
                          en: `Level ${level}`,
                          uk: `Рівень ${level}`,
                          es: `Nivel ${level}`,
                          "pt-BR": `Nível ${level}`,
                          vi: `Cấp độ ${level}`,
                          id: `Level ${level}`,
                          tr: `${level} seviyesi`,
                          pl: `Poziom ${level}`,
                        })}
                        onPress={() => selectLegacyLevel(level)}
                        variant="chip"
                        style={{
                          minWidth: 52,
                          height: 44,
                          borderRadius: 15,
                          backgroundColor: selected ? t.accent : t.bgCard,
                        }}
                        contentStyle={{
                          height: 44,
                          paddingHorizontal: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          // зачем: системный шрифт «очень крупный» не имеет права
                          // ломать рельсу — перенос тут невозможен (метка из двух
                          // знаков), а ужимать шрифт владелец запрещает. Поэтому
                          // ограничиваем множитель, а не размер глифа.
                          maxFontSizeMultiplier={1.3}
                          style={{
                            color: selected ? t.correctText : t.textSecond,
                            fontSize: 15,
                            lineHeight: 19,
                            fontWeight: "700",
                          }}
                        >
                          {level}
                        </Text>
                      </PressableHybrid>
                    );
                  })}
                  {/* зачем (владелец 2026-09-17): пользователь просил
                      «комбинированный урок» — несколько тем вперемешку, потому
                      что после 50 вопросов одной темы первые вопросы следующей
                      «туплю жёстко», а в жизни темы перемешаны. Вход владелец
                      велел сделать ПЯТОЙ кнопкой в этом же ряду и ПОСЛЕДНЕЙ,
                      чтобы привычный порядок уровней не сдвинулся.
                      Геометрия копирует чипы уровней выше (minWidth/height/
                      borderRadius), отличие только в цвете: золото = платное,
                      иначе кнопку прочитают как «пятый уровень».
                      alignSelf не задаём — см. комментарий к рельсе выше. */}
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
                      width: 52,
                      height: 44,
                      borderRadius: 15,
                      backgroundColor: t.goldBg,
                    }}
                    contentStyle={{
                      height: 44,
                      paddingHorizontal: 0,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* зачем (владелец 2026-09-17): «кнопка должна быть маленькой,
                        а не длинной» — слово COMBO делало чип вдвое шире уровней
                        и выдавливало ряд за экран. Оставляем один знак: иконка
                        перемешивания читается без подписи, а размер совпадает
                        с A1/A2/B1/B2. Название несёт accessibilityLabel выше. */}
                    <Ionicons name="shuffle" size={22} color={t.gold} />
                  </PressableHybrid>
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
                      disabled: !LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY,
                    }}
                    onPress={openNewLessons}
                    variant="chip"
                    style={{
                      // зачем: alignSelf убран намеренно — выравнивание задаёт
                      // контейнер прокрутки; спор с alignSelf:'stretch' из
                      // PressableHybrid схлопывал высоту чипа (B2 на скриншоте
                      // владельца 2026-09-17).
                      // зачем (владелец 2026-09-17): чип переехал ВНУТРЬ рельсы
                      // («это один ряд весь») и получил ТОТ ЖЕ размер, что чипы
                      // уровней и COMBO — 52×44. Раньше он занимал до 150pt и
                      // выдавливал уровни за правый край; теперь ряд состоит из
                      // одинаковых кнопок и читается как единая лента.
                      flexShrink: 0,
                      width: 52,
                      height: 44,
                      borderRadius: 15,
                      backgroundColor: t.bgCard,
                      // зачем: «серая» недоступность даётся тоном, а не обводкой —
                      // владелец запрещает рамки вокруг контейнеров.
                      opacity: LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? 1 : 0.45,
                    }}
                    contentStyle={{
                      height: 44,
                      paddingHorizontal: 0,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* зачем (владелец 2026-09-17): «кнопка новые уроки тоже
                        должна быть такого же размера». Подпись убрана — при
                        ширине 52 она не поместилась бы без ужатия шрифта, а
                        ужимать шрифт владелец запрещает. Название несёт
                        accessibilityLabel выше, а недоступность по-прежнему
                        объясняет строка-ответ под рядом. */}
                    <Ionicons
                      name="sparkles"
                      size={22}
                      color={
                        LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY ? t.accent : t.textMuted
                      }
                    />
                  </PressableHybrid>
                </ScrollView>
                {/* зачем: единственный признак, что рельса листается. Тоном, а не
                    обводкой — обводки контейнеров владелец запрещает. Не
                    перехватывает тапы, поэтому чип под ним остаётся нажимаемым. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[`${t.bgPrimary}00`, t.bgPrimary]}
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
              </View>
            </View>

            {/* зачем: ответ недоступной кнопки. Живёт под строкой с чипом,
                выровнен по правому краю — под самим чипом, а не под рельсом
                уровней, чтобы было видно, на что именно это ответ. Читаемый
                кегль, а не мелкая сноска-расшифровка. */}
            {learningV2LockedNoticeVisible ? (
              <Text
                testID="legacy-lessons-new-lessons-locked-notice"
                accessibilityLiveRegion="polite"
                style={{
                  paddingHorizontal: 12,
                  paddingBottom: 10,
                  marginTop: -2,
                  color: t.textSecond,
                  fontSize: 14,
                  lineHeight: 19,
                  fontWeight: "600",
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
                  <View style={{ paddingHorizontal: 40, paddingTop: 44, alignItems: "center" }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: "800", textAlign: "center" }}>
                      {triLang(lang, {
                        ru: "Ничего не нашлось", uk: "Нічого не знайшлося", en: "Nothing found",
                        es: "No se encontró nada", "pt-BR": "Nada encontrado", vi: "Không tìm thấy gì",
                        id: "Tidak ada yang cocok", tr: "Bir şey bulunamadı", pl: "Nic nie znaleziono",
                      })}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" }}>
                      {triLang(lang, {
                        ru: "Попробуй короче — например «прош» вместо целой фразы.",
                        uk: "Спробуй коротше — наприклад «мин» замість цілої фрази.",
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
              initialNumToRender={12}
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
              ListFooterComponent={
                <>
                  <View
                    style={{
                      alignItems: "center",
                      paddingTop: 28,
                      paddingBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#ffffff",
                        opacity: 0.15,
                        letterSpacing: 0.5,
                      }}
                    >
                      {triLang(lang, {
                        ru: "· · ·",
                        en: "· · ·",
                        uk: "· · ·",
                        es: "· · ·",
                        "pt-BR": "· · ·",
                        vi: "· · ·",
                        id: "· · ·",
                        tr: "· · ·",
                        pl: "· · ·",
                      })}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#ffffff",
                        opacity: 0.2,
                        marginTop: 8,
                      }}
                    >
                      {triLang(lang, {
                        ru: "Продолжение скоро",
                        en: "More coming soon",
                        uk: "Продовження незабаром",
                        es: "Próximamente",
                        "pt-BR": "Continuação em breve",
                        vi: "Sắp có tiếp",
                        id: "Segera hadir",
                        tr: "Devamı yakında",
                        pl: "Ciąg dalszy wkrótce",
                      })}
                    </Text>
                  </View>
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
                  const attestationAccent = isGoldTheme ? goldBright : t.accent;
                  const attestationColors = isGoldTheme
                    ? goldCardGradient("selected")
                    : [t.bgSurface2, t.bgSurface, t.bgCard];
                  const attestationBorder = isGoldTheme
                    ? GOLD_RICH.hairlineStrong
                    : t.borderHighlight;
                  const attestationText = isGoldTheme
                    ? t.textPrimary
                    : t.textOnCard;
                  const attestationMuted = isGoldTheme
                    ? t.textMuted
                    : t.textMuted;
                  return (
                    <Animated.View
                      key="attestation-after-32"
                      style={{
                        marginTop: 12,
                        marginHorizontal: 14,
                        borderRadius: 18,
                        transform: [{ scale: scaleAnim ?? 1 }],
                        shadowColor: isGoldTheme ? "#000" : t.cardShadow,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: isGoldTheme ? 0 : 0.16,
                        shadowRadius: 14,
                        ...noAndroidOutline,
                        ...(isGoldTheme ? goldShadow(2) : {}),
                        ...{},
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => {
                          hapticTap();
                          router.push("/diagnostic_test");
                        }}
                        style={{
                          minHeight: 126,
                          borderRadius: 18,
                          borderWidth: 0,
                          borderColor: attestationBorder,
                          overflow: "hidden",
                          backgroundColor: isGoldTheme ? goldSurface : t.bgCard,
                        }}
                      >
                        <LinearGradient
                          colors={attestationColors as any}
                          locations={
                            isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                          }}
                        />
                        <Image
                          source={menuImages.test}
                          style={{
                            position: "absolute",
                            right: -16,
                            top: 7,
                            width: 128,
                            height: 128,
                            opacity: isGoldTheme ? 0.16 : 0.08,
                          }}
                          contentFit="contain"
                        />
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 6,
                            backgroundColor: attestationAccent,
                            opacity: 0.88,
                          }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            left: 6,
                            right: 0,
                            top: 0,
                            height: 1,
                            backgroundColor: attestationAccent,
                            opacity: 0.24,
                          }}
                        />
                        {isGoldTheme && (
                          <GoldBevel radius={18} intensity="normal" />
                        )}
                        <View
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            paddingLeft: 20,
                            paddingRight: 14,
                            gap: 14,
                          }}
                        >
                          <View
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 36,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isGoldTheme
                                ? "rgba(255,235,180,0.10)"
                                : t.accentBg,
                              borderWidth: 1,
                              borderColor: attestationBorder,
                            }}
                          >
                            <Image
                              source={menuImages.test}
                              style={{ width: 58, height: 58, opacity: 0.96 }}
                              contentFit="contain"
                            />
                          </View>
                          <View
                            style={{
                              flex: 1,
                              minWidth: 0,
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: attestationMuted,
                                fontSize: Math.max(12, f.label),
                                fontWeight: "800",
                                letterSpacing: 0,
                                textTransform: "uppercase",
                              }}
                            >
                              B2 / CEFR
                            </Text>
                            {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — статично
                          уменьшен базовый размер (было 27, стало 22), чтобы влезали длинные варианты
                          перевода («Değerlendirme», «Evaluación») без ужимания на рендере, guard-ok */}
                            <Text
                              style={{
                                color: attestationText,
                                fontSize: Math.max(22, Math.min(f.h1, 27)),
                                lineHeight: Math.max(
                                  27,
                                  Math.min(f.h1, 27) + 4,
                                ),
                                fontWeight: "900",
                                letterSpacing: 0,
                              }}
                            >
                              {s.home.attestTile}
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 23,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isGoldTheme
                                ? "rgba(255,235,180,0.12)"
                                : t.accentBg,
                              borderWidth: 0,
                              borderColor: attestationBorder,
                            }}
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={26}
                              color={attestationAccent}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }
                if (item.kind === "header") {
                  const premiumLocked =
                    !isPremium &&
                    !effectiveDevContentUnlock &&
                    !effectiveNoLimits &&
                    item.label !== "A1";
                  const accent = isGoldTheme
                    ? goldCefrAccent(item.label).accent
                    : item.color;
                  return (
                    <View
                      style={{
                        paddingLeft: 22,
                        paddingTop: 14,
                        paddingBottom: 4,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 3,
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: accent,
                        }}
                      />
                      <Text
                        style={{
                          color: accent,
                          fontSize: f.label,
                          fontWeight: "800",
                          letterSpacing: 1.4,
                        }}
                      >
                        {item.label}
                      </Text>
                      {premiumLocked ? (
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color={accent}
                          style={{ opacity: 0.7 }}
                        />
                      ) : null}
                      <View
                        style={{
                          flex: 1,
                          height: 0.5,
                          backgroundColor: `${accent}30`,
                        }}
                      />
                    </View>
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
            const chapterAccent = isGoldTheme ? goldCefrAccent(chapterLevel).accent : t.accent;
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
                  bottom: 96,
                  alignItems: "center",
                },
                learningV2DenialHintStyle,
              ]}
            >
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  shadowColor: t.cardShadow,
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }}
              >
                <Text
                  style={{
                    color: t.textPrimary,
                    fontSize: 14.5,
                    fontWeight: "700",
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
        family={legacyLessonsIntroDef.family}
        art={legacyLessonsIntroDef.art}
        title={legacyLessonsIntroDef.title(lang)}
        body={legacyLessonsIntroDef.body(lang)}
        ctaLabel={legacyLessonsIntroDef.ctaLabel(lang)}
        laterLabel={featureIntroClose(lang)}
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
      {/* зачем: здесь стояло условие learningV2FounderNickname !== null. У
          человека без имени в профиле ник никогда не появлялся, и модал не
          показывался НИ РАЗУ — при требовании владельца «1 раз каждый юзер».
          Модал рисуется всегда; без имени он просто не печатает строку ника. */}
      <LearningV2FounderPassModal
        visible={learningV2FounderPassVisible}
        nickname={learningV2FounderNickname}
        onDismiss={dismissLearningV2FounderPass}
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
          selectedLearningV2Session?.state === "completed"
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
        onPrimaryPress={() => launchSelectedLearningV2Session(false)}
        secondaryLabel={triLang(lang, {
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
      {learningV2DictionaryOpen && expandedLearningV2Lesson !== null ? (
        <LearningV2LessonDictionaryOverlayV1
          lessonOrdinal={expandedLearningV2Lesson}
          words={learningV2DictionaryWords}
          onClose={() => setLearningV2DictionaryOpen(false)}
        />
      ) : null}
      <ThemedChoiceModal
        visible={gateModal !== null}
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
                  uk: `Пройдіть всі уроки ${gateModal.level} з оцінкою 4.5+, щоб відкрити`,
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
                    uk: `Щоб відкрити рівень ${gateModal.level}, спочатку складіть залік ${gateModal.prevLevel}.`,
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
                          ru: `Пройди урок ${gateModal.prevNum} на 2.5+, чтобы открыть этот`,
                      en: `Complete lesson ${gateModal.prevNum} with 2.5+ to unlock`,
                      uk: `Пройдіть урок ${gateModal.prevNum} з оцінкою 2.5+, щоб відкрити`,
                      es: `Completa la lección ${gateModal.prevNum} con nota mínima de 2,5 para desbloquear`,
                      "pt-BR": `Conclua a lição ${gateModal.prevNum} com nota 2,5+ para desbloquear`,
                      vi: `Hoàn thành bài học ${gateModal.prevNum} với điểm 2.5+ để mở khóa`,
                      id: `Selesaikan pelajaran ${gateModal.prevNum} dengan nilai 2,5+ untuk membuka`,
                      tr: `Kilidi açmak için ${gateModal.prevNum}. dersi 2.5+ puanla tamamla`,
                      pl: `Ukończ lekcję ${gateModal.prevNum} z wynikiem 2,5+, aby odblokować`,
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
        choices={
          // зачем (владелец 2026-09-17): у замка по прогрессу человек не должен
          // упереться в тупик — рядом с причиной сразу лежит выход: открыть
          // именно этот урок за 100 жемчужин, навсегда. Одна шторка, одно решение.
          //
          // зачем (владелец 2026-09-20): условие было голым `isPremium`, и после
          // закрытия уроков 2–3 Free получил РОВНО ТОТ ТУПИК, который обещает
          // не допускать комментарий выше: причина есть, выхода нет. Теперь кнопка
          // есть там, где замок ИМЕННО по прогрессу: у Plus — везде, у Free — на
          // уроках без пейвола (2–3). На уроках 4+ у Free пейвол, а не покупка —
          // туда ведёт отдельный экран, и покупка там не предлагается.
          (isPremium || (gateModal?.kind === "lesson" && !requiresPremiumForLesson(gateModal.lessonNum)))
            && (gateModal?.kind === "lesson" || gateModal?.kind === "levelGate")
            ? [
                {
                  /**
                   * ОДИН текст всегда (владелец 2026-09-18): «Разблокировать»
                   * + цена + ассет жемчужины.
                   *
                   * зачем убрано «Не хватает жемчужин»: кнопка сообщала отказ
                   * ДО нажатия и читалась как мёртвая. Человек и так видит свой
                   * баланс в шапке; кнопка должна называть ДЕЙСТВИЕ и цену, а
                   * нехватку объяснит ответ по тапу. Название валюты словом
                   * тоже убрано — его заменяет настоящий ассет справа.
                   */
                  label: triLang(lang, {
                    ru: `Разблокировать · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    en: `Unlock · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    uk: `Розблокувати · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    es: `Desbloquear · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    "pt-BR": `Desbloquear · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    vi: `Mở khóa · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    id: `Buka · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    tr: `Kilidi aç · ${LESSON_PEARL_UNLOCK_PRICE}`,
                    pl: `Odblokuj · ${LESSON_PEARL_UNLOCK_PRICE}`,
                  }),
                  icon: oskolokImageForPackShards(LESSON_PEARL_UNLOCK_PRICE),
                  variant: "primary" as const,
                  onPress: () => {
                    void buyLessonUnlock(gateModal.lessonNum);
                  },
                },
                {
                  label: triLang(lang, {
                    ru: "Закрыть",
                    en: "Close",
                    uk: "Закрити",
                    es: "Cerrar",
                    "pt-BR": "Fechar",
                    vi: "Đóng",
                    id: "Tutup",
                    tr: "Kapat",
                    pl: "Zamknij",
                  }),
                  variant: "secondary" as const,
                  onPress: () => {
                    setGateModal(null);
                  },
                },
              ]
            : [
                {
                  label: triLang(lang, {
                    ru: "Закрыть",
                    en: "Close",
                    uk: "Закрити",
                    es: "Cerrar",
                    "pt-BR": "Fechar",
                    vi: "Đóng",
                    id: "Tutup",
                    tr: "Kapat",
                    pl: "Zamknij",
                  }),
                  onPress: () => {
                    setGateModal(null);
                  },
                },
              ]
        }
        onRequestClose={() => setGateModal(null)}
      />
      {/* Празднование первой покупки урока — на СВОЁМ экране, не глобальным
          оверлеем (правило владельца о празднованиях). */}
      <FirstPurchaseSealCelebration
        visible={celebratingLesson !== null}
        kind="lesson"
        subjectTitle={triLang(lang, {
          ru: `Урок ${celebratingLesson ?? ''}`,
          en: `Lesson ${celebratingLesson ?? ''}`,
          uk: `Урок ${celebratingLesson ?? ''}`,
          es: `Lección ${celebratingLesson ?? ''}`,
          'pt-BR': `Lição ${celebratingLesson ?? ''}`,
          vi: `Bài học ${celebratingLesson ?? ''}`,
          id: `Pelajaran ${celebratingLesson ?? ''}`,
          tr: `Ders ${celebratingLesson ?? ''}`,
          pl: `Lekcja ${celebratingLesson ?? ''}`,
        })}
        title={triLang(lang, {
          ru: 'Урок открыт',
          en: 'Lesson unlocked',
          uk: 'Урок відкрито',
          es: 'Lección desbloqueada',
          'pt-BR': 'Lição desbloqueada',
          vi: 'Đã mở bài học',
          id: 'Pelajaran terbuka',
          tr: 'Ders açıldı',
          pl: 'Lekcja odblokowana',
        })}
        subtitle={triLang(lang, {
          ru: 'Теперь он твой навсегда',
          en: 'It is yours for good',
          uk: 'Тепер він твій назавжди',
          es: 'Es tuya para siempre',
          'pt-BR': 'Agora é sua para sempre',
          vi: 'Nó là của bạn mãi mãi',
          id: 'Sekarang milikmu selamanya',
          tr: 'Artık kalıcı olarak senin',
          pl: 'Jest twoja na zawsze',
        })}
        ctaLabel={triLang(lang, {
          ru: 'Начать урок',
          en: 'Start lesson',
          uk: 'Почати урок',
          es: 'Empezar lección',
          'pt-BR': 'Começar lição',
          vi: 'Bắt đầu bài học',
          id: 'Mulai pelajaran',
          tr: 'Derse başla',
          pl: 'Rozpocznij lekcję',
        })}
        onDone={() => {
          const lessonNum = celebratingLesson;
          setCelebratingLesson(null);
          if (lessonNum === null) return;
          console.log('[LESSON-UNLOCK] celebrate_done', JSON.stringify({ lessonNum })); // guard-ok: финальный результат обязан логироваться и в релизе
          router.push({ pathname: '/lesson_menu', params: { id: lessonNum } });
        }}
      />
    </>
  );
}

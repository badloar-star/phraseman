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
  Pressable,
  TouchableOpacity,
  Animated,
  InteractionManager,
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
import { useFeatureAccess, usePremium } from "../../components/PremiumContext";
import {
  FREE_LESSON_LIMIT,
  buildSequentialFreeLessonUnlocks,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
} from "../monetization_policy";
import { openPremiumPaywall } from "../paywall_navigation";
import { lessonPurchaseContinuationParams } from "../paywall_lesson_continuation";
import { HOME_BACK_FALLBACK, safeRouterBack } from "../navigation_back";
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
} from "../account_generation";
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
import type { ThemeMode } from "../../constants/theme";
import GoldBevel from "../../components/GoldBevel";
import { DEV_CONTENT_UNLOCK, ENABLE_DEV_TOOLS } from "../config";
import { hapticTap } from "../../hooks/use-haptics";
import { useReduceMotionPreference } from "../../hooks/use_reduce_motion";
import { useTabContentBottomPad } from "../../hooks/use-tab-content-bottom-pad";
import { useRuntimeActive } from "../../hooks/use_runtime_active";
import LearningV2InlineNodeReveal from "../../components/LearningV2InlineNodeReveal";
import LearningV2MapNode from "../../components/LearningV2MapNode";
import LearningV2RuneFlight, {
  type LearningV2RuneFlightPoint,
} from "../../components/LearningV2RuneFlight";
import RuneGlyph from "../../components/RuneGlyph";
import { runeWord } from "../../constants/runes";
import {
  hydrateCurrentLearningV2WalletBalance,
  peekCurrentLearningV2WalletBalance,
  subscribeLearningV2WalletBalance,
  type LearningV2WalletBalanceSnapshot,
} from "../learning_v2_wallet_balance_store";
import { WALLET_SUBUNITS_PER_STAR } from "../../modules/learning-v2/contracts/wallet";
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
import LearningV2SessionOutcomeSheet from "../../components/LearningV2SessionOutcomeSheet";
import LearningV2LessonDictionaryOverlayV1 from "../../components/learning-v2/LearningV2LessonDictionaryOverlayV1";
import { useLearningV2UnlockedLessonWordsV1 } from "../../hooks/use_learning_v2_unlocked_lesson_words_v1";
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
import { onAppEvent } from "../events";
import { shouldGateFeature } from "../feature_gates";
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
import { animateNextLayoutShiftWithoutEntryFade } from "../smooth_layout";
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
import { preloadCurrentLearningV2CourseReleasedSessionV2 } from "../learning_v2_course_released_session_client_v2";
import type { LearningV2ActiveCourseCatalogV1 } from "../../modules/learning-v2/runtime/course_active_catalog_v1";
import type { LearningV2CourseSessionOutcomeKindV1 } from "../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import { learningV2CourseSessionIdV1 } from "../../modules/learning-v2/content/course_topology_v1";
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
          numberOfLines={1}
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
      | { kind: "lesson"; prevNum: number }
      | { kind: "levelGate"; level: string; prevLevel: string }
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
  onLearningV2PressIn,
  onLearningV2Press,
}: LessonCardProps) {
  const isSagePorcelainCard = _themeMode === "sagePorcelain";
  const isOliveTheme = _themeMode === "olive";
  const lockedCardHasLightFill = _themeMode === "sagePorcelain";
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
              });
            } else {
              setGateModal({ kind: "lesson", prevNum: num - 1 });
            }
          }}
          style={{
            height: BOOK_H,
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
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 18 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
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
                maxFontSizeMultiplier={1}
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
                {premiumRequired ? (
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
                    maxFontSizeMultiplier={1}
                  >
                    {progPct}%
                  </Text>
                ) : null}
              </View>
            </View>
            {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — текст уже
                переносится на 2 строки (numberOfLines={2}), этого достаточно, guard-ok */}
            <Text
              style={{
                color: lessonTextColor,
                fontSize: f.body,
                fontWeight: "700",
                ...(isSagePorcelainCard ? {} : LESSON_CARD_WHITE_TEXT_SHADOW),
              }}
              numberOfLines={2}
              maxFontSizeMultiplier={1}
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
  const isSagePorcelainTheme = themeMode === "sagePorcelain";
  const goldBright = GOLD_RICH.champagne;
  const goldAntique = GOLD_RICH.agedGold;
  const goldHairline = GOLD_RICH.hairline;
  const goldSurface = GOLD_RICH.blackPiano;
  const menuImages = getHomeMenuImages(themeMode);
  const screenTitleColor = t.textPrimary;
  const { lang, s } = useLang();
  const { studyTarget } = useStudyTarget();
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
      void withAccountTransitionLock(async () => {
        const stableId = await getStableId();
        const accountScopeHash =
          deriveLocalOfflineProgressAccountScopeHash(stableId);
        const state = await createLearningV2CourseLocalProgressStoreV1(
          AsyncStorage,
        ).load(accountScopeHash);
        // зачем: звёзды 0–3 на пройденных узлах читаются в том же прогреве, что
        // и прогресс — один заход на диск вместо двух, ноль запросов к серверу.
        await hydrateLearningV2SessionStarResults(accountScopeHash);
        return {
          completedSessionIds: state.completedSessionIds,
          currentSessionId: state.currentSessionId,
        };
      })
        .then((value) => {
          if (!cancelled) {
            setLearningV2Progress({
              completedSessionIds: value.completedSessionIds,
              currentSessionId: value.currentSessionId,
            });
          }
        })
        .catch(() => undefined);
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
  const learningV2ProjectionScopeKey = useMemo(
    () =>
      `${captureAccountGeneration().generation}:${studyTarget}:${_overlayIdentityEpoch}`,
    [_overlayIdentityEpoch, studyTarget],
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
  const learningV2Accordion = useMemo(
    () =>
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: learningV2ProjectionScopeKey,
        expandedLessonOrdinal: expandedLearningV2Lesson,
        preparedProgress: learningV2PreparedProgress,
      }),
    [
      expandedLearningV2Lesson,
      learningV2PreparedProgress,
      learningV2ProjectionScopeKey,
    ],
  );
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
  // зачем: чип баланса звёзд в шапке страницы V2 + полёт звёзд в него после
  // пройденной сессии (выбор владельца 22.08: «чип в шапке», сцена A5 макета).
  // Баланс — локальная presentation-проекция кошелька: peek + подписка +
  // hydrate из AsyncStorage при входе на страницу; ноль запросов к серверу.
  const [learningV2WalletBalance, setLearningV2WalletBalance] =
    useState<LearningV2WalletBalanceSnapshot | null>(() =>
      peekCurrentLearningV2WalletBalance(),
    );
  const learningV2WalletFingerprintRef = useRef<string | null>(null);
  const learningV2WalletChipRef = useRef<View>(null);
  const learningV2WalletPulse = useSharedValue(1);
  const learningV2WalletPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: learningV2WalletPulse.value }],
  }));
  useEffect(() => {
    const refresh = () =>
      setLearningV2WalletBalance(peekCurrentLearningV2WalletBalance());
    const unsubscribeBalance = subscribeLearningV2WalletBalance(refresh);
    const accountSubscription = subscribeAccountGeneration(refresh);
    refresh();
    return () => {
      unsubscribeBalance();
      accountSubscription.remove();
    };
  }, []);
  useEffect(() => {
    if (page !== "v2" || !lessonsRuntimeActive) return;
    void hydrateCurrentLearningV2WalletBalance().catch(() => {});
  }, [page, lessonsRuntimeActive]);
  useEffect(() => {
    // Тот же bump, что на push-экране урока: 1 → 1.16 → 1 при смене кошелька.
    const next = learningV2WalletBalance?.walletStateFingerprint ?? null;
    const previous = learningV2WalletFingerprintRef.current;
    learningV2WalletFingerprintRef.current = next;
    if (
      !next ||
      !previous ||
      next === previous ||
      learningV2ReduceMotionPreference !== false
    )
      return;
    learningV2WalletPulse.value = withSequence(
      withTiming(1.16, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    );
  }, [
    learningV2ReduceMotionPreference,
    learningV2WalletBalance?.walletStateFingerprint,
    learningV2WalletPulse,
  ]);
  const learningV2WalletRunesValue =
    learningV2WalletBalance === null
      ? null
      : learningV2WalletBalance.balanceSubunits / WALLET_SUBUNITS_PER_STAR;
  const learningV2WalletStarsLabel =
    learningV2WalletRunesValue === null
      ? "—"
      : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
          learningV2WalletRunesValue,
        );
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
  const [learningV2RuneFlight, setLearningV2RuneFlight] = useState<{
    key: number;
    from: LearningV2RuneFlightPoint;
    to: LearningV2RuneFlightPoint;
  } | null>(null);
  const clearLearningV2RuneFlight = useCallback(
    () => setLearningV2RuneFlight(null),
    [],
  );
  const handleLearningV2SessionCompletedAt = useCallback(
    (point: LearningV2RuneFlightPoint) => {
      if (learningV2ReduceMotionPreference !== false) return;
      const chip = learningV2WalletChipRef.current;
      if (!chip) return;
      chip.measureInWindow((x, y, width, height) => {
        setLearningV2RuneFlight({
          key: Date.now(),
          from: point,
          to: { x: x + width / 2, y: y + height / 2 },
        });
      });
    },
    [learningV2ReduceMotionPreference],
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
      if (
        !learningV2DevUnlockAllActive &&
        state !== "current" &&
        state !== "completed"
      ) {
        const currentRow = learningV2Accordion.rows.find(
          (mapRow) =>
            mapRow.kind === "session" &&
            mapRow.lessonOrdinal === selectedLesson &&
            mapRow.state === "current",
        );
        const currentOrdinal =
          currentRow && currentRow.kind === "session"
            ? currentRow.sessionOrdinal
            : null;
        showLearningV2DenialHint(
          currentOrdinal !== null
            ? triLang(lang, {
                ru: `Сначала пройди сессию ${currentOrdinal}`,
                en: `Finish session ${currentOrdinal} first`,
                uk: `Спочатку пройди сесію ${currentOrdinal}`,
                es: `Primero completa la sesión ${currentOrdinal}`,
                "pt-BR": `Primeiro conclua a sessão ${currentOrdinal}`,
                vi: `Hãy hoàn thành buổi ${currentOrdinal} trước`,
                id: `Selesaikan dulu sesi ${currentOrdinal}`,
                tr: `Önce ${currentOrdinal}. oturumu tamamla`,
                pl: `Najpierw ukończ sesję ${currentOrdinal}`,
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
      const usesDevDraftPreview =
        learningV2DevUnlockAllActive &&
        studyTarget === "en" &&
        selectedLesson === 1;
      if (!usesDevDraftPreview) {
        void preloadCurrentLearningV2CourseReleasedSessionV2({
          environment: learningV2Catalog?.environment ?? "production",
          targetLanguage: studyTarget,
          studyTarget,
          learnerSourceLocale: lang,
          seasonId: learningV2Catalog?.seasonId ?? "learning-v2",
          lessonOrdinal: selectedLesson,
          sessionOrdinal,
        }).catch(() => undefined);
      }
      setSelectedLearningV2Session({
        lessonOrdinal: selectedLesson,
        sessionOrdinal,
        state,
      });
    },
    [
      lang,
      learningV2Accordion.rows,
      learningV2Catalog,
      learningV2DevUnlockAllActive,
      showLearningV2DenialHint,
      studyTarget,
    ],
  );
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
          openPremiumPaywall(router, { context: "personal_plan" });
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
      }
    | {
        kind: "levelGate";
        level: string;
        prevLevel: string;
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
      setScores(snapshot.scores);
      setProgCounts(snapshot.progCounts);
      setPassCounts(snapshot.passCounts);
      setExamResults(snapshot.examResults);
      setExamBestPcts(snapshot.examBestPcts);
      setExamPassCounts(snapshot.examPassCounts);
      writeLessonsUiSessionCache(lessonCacheTarget, snapshot);
    } catch {
      /* ignore */
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
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    void loadScores();
  }, [focusTick, isRetainedTab, lessonsTabVisible, loadScores]);
  const lessons = useMemo(() => {
    const fallback = lessonNamesForStudyTarget(lang, studyTarget);
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
    if (isPremium) {
      for (let i = 0; i < 32; i++) {
        const levelIdx = getCourseLevelIndex(getCourseLevelForLesson(i + 1));
        u[i] = levelIdx <= premiumReachableLevelIndex;
      }
      return u;
    }
    return buildSequentialFreeLessonUnlocks({
      scores,
      persistedUnlocked,
      lessonCount: u.length,
      legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
    });
  }, [
    effectiveDevContentUnlock,
    effectiveLegacyFreeLessonCap,
    effectiveNoLimits,
    isPremium,
    persistedUnlocked,
    premiumReachableLevelIndex,
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
      for (const row of learningV2Accordion.rows) {
        if (row.kind === "lesson") {
          const index = row.lessonOrdinal - 1;
          data.push({
            kind: "lesson",
            index,
            name:
              lessons[index] ??
              `${triLang(lang, {
                ru: "Урок",
                en: "Lesson",
                uk: "Урок",
                es: "Lección",
                "pt-BR": "Lição",
                vi: "Bài",
                id: "Pelajaran",
                tr: "Ders",
                pl: "Lekcja",
              })} ${row.lessonOrdinal}`,
          });
        } else if (row.kind === "chapter") {
          data.push({ kind: "v2_chapter", row });
        } else {
          data.push({ kind: "v2_session", row });
        }
      }
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
  }, [lang, learningV2Accordion.rows, lessons, page, themeMode]);
  const currentLessonNum = useMemo(() => {
    const idx = unlockedLessons.findIndex(
      (unlocked, i) => unlocked && (progCounts[i] ?? 0) < 50,
    );
    return idx >= 0 ? idx + 1 : null;
  }, [progCounts, unlockedLessons]);
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
        : `✗ ${result.pct}%`
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
  }: {
    index: number;
    name: string;
  }): React.ReactNode => {
    const num = index + 1;
    const isUnlocked = page === "v2" ? true : unlockedLessons[index];
    const bg = bookPalette(num, themeMode);
    const darkBg = darkenHexCached(bg, 0.42);
    const progPct =
      page === "v2"
        ? 0
        : Math.min(100, Math.round(((progCounts[index] ?? 0) / 50) * 100));
    const isComplete = progPct >= 100;
    const isCurrent = page === "v2" ? num === 1 : currentLessonNum === num;
    const lessonLevel = getCourseLevelForLesson(num);
    const lessonGoldLevel = goldCefrAccent(lessonLevel);
    const lessonAccent = bg;
    const prevLessonLevel = getPreviousCourseLevel(lessonLevel);
    const levelLockedByExam =
      isPremium &&
      !isUnlocked &&
      !effectiveDevContentUnlock &&
      !effectiveNoLimits;
    const premiumRequired =
      page === "v2"
        ? false
        : !isPremium &&
          !effectiveNoLimits &&
          requiresPremiumForLesson(num, effectiveLegacyFreeLessonCap);
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
        onLearningV2PressIn={prepareLearningV2Lesson}
        onLearningV2Press={toggleLearningV2Lesson}
      />
    );
  };

  // ── Тела глав (плашки уроков + зачёт) мемоизированы ─────────────────────
  // Тап по шапке главы меняет только openChapters; без мемоизации каждый тап
  // перерендеривал все ~32 тяжёлые карточки уроков (градиенты/тени/SVG) —
  // отсюда подтормаживание раскрытия. Одинаковые ссылки на элементы дают
  // React bail-out, и раскрытие анимируется без JS-шторма.
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <ScreenGradient forceFullBleed>
        {/* Фиксированная шапка (вне скролла): назад + заголовок + энергия.
          Push-экран сам держит верхний safe-area отступ (insets.top ниже). */}
        <View>
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
                numberOfLines={1}
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
              {page === "v2" ? (
                <Reanimated.View style={learningV2WalletPulseStyle}>
                  {/* зачем: владелец 2026-08-24 — тап по счётчику рун открывает раздел «Руны».
                      Ref остаётся на внутреннем View: он — мишень полёта глифов. */}
                  <TapScale
                    withHaptic={true}
                    onPress={() => router.push("/runes_wallet")}
                  >
                    <View
                      ref={learningV2WalletChipRef}
                      collapsable={false}
                      accessibilityRole="button"
                      accessibilityLabel={`${learningV2WalletStarsLabel} ${runeWord(
                        lang,
                        Math.round(learningV2WalletRunesValue ?? 0),
                      )}`}
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
                      <RuneGlyph size={14} color={t.gold} />
                      <Text
                        style={{
                          color: t.textPrimary,
                          fontSize: 14,
                          fontWeight: "700",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {learningV2WalletStarsLabel}
                      </Text>
                    </View>
                  </TapScale>
                </Reanimated.View>
              ) : null}
              <EnergyBar size={30} ownerActive={lessonsRuntimeActive} />
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
            {ENABLE_DEV_TOOLS ? (
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
                    setPage("v2");
                  }
                }}
              />
            ) : null}
          </View>
          {__DEV__ && ENABLE_DEV_TOOLS && page === "v2" ? (
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 8,
                paddingBottom: 10,
                alignItems: "flex-end",
              }}
            >
              <Pressable
                testID="learning-v2-dev-unlock-all-sessions"
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
                  hapticTap();
                  setLearningV2DevUnlockAllRequested((current) => !current);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: learningV2DevUnlockAllActive
                    ? t.correct
                    : t.border,
                  backgroundColor: learningV2DevUnlockAllActive
                    ? t.correct
                    : t.bgCard,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <Ionicons
                  name={
                    learningV2DevUnlockAllActive
                      ? "lock-open"
                      : "lock-closed-outline"
                  }
                  size={18}
                  color={
                    learningV2DevUnlockAllActive
                      ? t.correctText
                      : t.textPrimary
                  }
                />
                <Text
                  style={{
                    color: learningV2DevUnlockAllActive
                      ? t.correctText
                      : t.textPrimary,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {learningV2DevUnlockAllActive
                    ? "DEV: вернуть замки"
                    : "DEV: открыть все"}
                </Text>
              </Pressable>
            </View>
          ) : null}
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
          <BouncyWrap style={bouncyStyle}>
            <Animated.FlatList
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleLessonsScroll}
              onScrollEndDrag={handleLessonsScrollEnd}
              onMomentumScrollEnd={handleLessonsScrollEnd}
              contentContainerStyle={{ paddingBottom: listBottomPad }}
              decelerationRate="fast"
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              data={listData}
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
              // зачем: раздел «Уроки» открывался ПУСТЫМ. Список живёт внутри
              // BouncyWrap — Animated.View с постоянным translateY. При
              // removeClippedSubviews RN меряет видимую область по родителю со
              // сдвигом, считает все строки «за экраном» и вырезает их: шапка
              // есть, уроков нет, и они появляются только когда скролл сдвинет
              // окно. Это единственное место в проекте, где обрезка стояла
              // безусловно (везде — false или только Android). Экономия здесь
              // мнимая: 36 строк с фиксированной высотой держит windowSize.
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
                      onSessionCompleted={handleLearningV2SessionCompletedAt}
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
                              numberOfLines={1}
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
                              numberOfLines={1}
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
          {page === "v2" && expandedLearningV2Lesson !== null ? (
            <Pressable
              testID="learning-v2-map-dictionary-open"
              accessibilityRole="button"
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
              onPress={() => {
                hapticTap();
                setLearningV2DictionaryOpen(true);
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                position: "absolute",
                right: 18,
                bottom: listBottomPad + 18,
                minWidth: 54,
                height: 54,
                paddingHorizontal: 14,
                borderRadius: 19,
                backgroundColor: t.bgCard,
                borderWidth: 1,
                borderColor: `${t.accent}66`,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                opacity: pressed ? 0.72 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
                shadowColor: t.cardShadow,
                shadowOpacity: 0.28,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 7 },
                elevation: 7,
                zIndex: 40,
              })}
            >
              <Ionicons name="book-outline" size={23} color={t.accent} />
              {learningV2DictionaryWords.length > 0 ? (
                <Text
                  style={{
                    color: t.textPrimary,
                    fontSize: 13,
                    lineHeight: 16,
                    fontWeight: "900",
                  }}
                >
                  {learningV2DictionaryWords.length}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
          {learningV2RuneFlight !== null ? (
            <LearningV2RuneFlight
              key={learningV2RuneFlight.key}
              from={learningV2RuneFlight.from}
              to={learningV2RuneFlight.to}
              color={t.gold}
              onDone={clearLearningV2RuneFlight}
            />
          ) : null}
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
      </ScreenGradient>
      <LearningV2SessionOutcomeSheet
        visible={selectedLearningV2Session !== null}
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
        onPrimaryPress={() => {
          const selected = selectedLearningV2Session;
          if (!selected) return;
          setSelectedLearningV2Session(null);
          const sessionId = learningV2CourseSessionIdV1(
            selected.lessonOrdinal,
            selected.sessionOrdinal,
          );
          requestAnimationFrame(() => {
            router.push({
              pathname: "/learning-v2/session/[id]",
              params: {
                id: sessionId,
                runtimeMode: "direct_v1",
                lessonOrdinal: String(selected.lessonOrdinal),
                sessionOrdinal: String(selected.sessionOrdinal),
                releaseEnvironment:
                  learningV2Catalog?.environment ?? "production",
                releaseSeasonId:
                  learningV2Catalog?.seasonId ?? "learning-v2",
                runKind:
                  selected.state === "completed" ? "repeat" : "initial",
                ...(__DEV__ &&
                ENABLE_DEV_TOOLS &&
                learningV2DevUnlockAllActive &&
                studyTarget === "en" &&
                selected.lessonOrdinal === 1
                  ? {
                      previewMode: "dev_unlocked_drafts_v1",
                      previewOrigin: "course",
                    }
                  : __DEV__ &&
                      studyTarget === "en" &&
                      selected.lessonOrdinal === 1 &&
                      selected.sessionOrdinal === 1
                  ? {
                      previewMode: "authoring_v1",
                      previewOrigin: "course",
                    }
                  : {}),
              },
            } as never);
          });
        }}
        secondaryLabel={triLang(lang, {
          ru: "Не сейчас",
          en: "Not now",
          uk: "Не зараз",
          es: "Ahora no",
          "pt-BR": "Agora não",
          vi: "Để sau",
          id: "Nanti saja",
          tr: "Şimdi değil",
          pl: "Nie teraz",
        })}
        onClose={() => setSelectedLearningV2Session(null)}
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
                        ru: "Урок заблокирован",
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
                  ru: `Сначала пройди все уроки ${gateModal.level} с оценкой 4.5+`,
                  en: `First, complete all ${gateModal.level} lessons with 4.5+`,
                  uk: `Спочатку пройдіть всі уроки ${gateModal.level} з оцінкою 4.5+`,
                  es: `Primero completa todas las lecciones de ${gateModal.level} con nota mínima de 4,5`,
                  "pt-BR": `Primeiro conclua todas as lições ${gateModal.level} com nota 4,5+`,
                  vi: `Trước tiên hãy hoàn thành tất cả bài học ${gateModal.level} với điểm 4.5+`,
                  id: `Selesaikan dulu semua pelajaran ${gateModal.level} dengan nilai 4,5+`,
                  tr: `Önce tüm ${gateModal.level} derslerini 4.5+ puanla tamamla`,
                  pl: `Najpierw ukończ wszystkie lekcje ${gateModal.level} z wynikiem 4,5+`,
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
                      ru: `Пройди урок ${gateModal.prevNum} с оценкой 2.5+`,
                      en: `Complete lesson ${gateModal.prevNum} with 2.5+`,
                      uk: `Пройдіть урок ${gateModal.prevNum} з оцінкою 2.5+`,
                      es: `Completa la lección ${gateModal.prevNum} con nota mínima de 2,5`,
                      "pt-BR": `Conclua a lição ${gateModal.prevNum} com nota 2,5+`,
                      vi: `Hoàn thành bài học ${gateModal.prevNum} với điểm 2.5+`,
                      id: `Selesaikan pelajaran ${gateModal.prevNum} dengan nilai 2,5+`,
                      tr: `${gateModal.prevNum}. dersi 2.5+ puanla tamamla`,
                      pl: `Ukończ lekcję ${gateModal.prevNum} z wynikiem 2,5+`,
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
          gateModal?.kind === "premium"
            ? [
                {
                  label: triLang(lang, {
                    ru: "Получить Plus",
                    en: "Get Plus",
                    uk: "Отримати Plus",
                    es: "Obtener Plus",
                    "pt-BR": "Obter Plus",
                    vi: "Nhận Plus",
                    id: "Dapatkan Plus",
                    tr: "Plus al",
                    pl: "Zdobądź Plus",
                  }),
                  variant: "primary" as const,
                  onPress: () => {
                    // ThemedChoiceModal больше не зовёт onRequestClose за нас —
                    // закрытие гейта здесь же, одним действием.
                    setGateModal(null);
                    const doneSoFar = scores.filter(
                      (score) => score > 0,
                    ).length;
                    openPremiumPaywall(router, {
                      context: lessonPaywallContext(
                        gateModal.lessonNum,
                        effectiveLegacyFreeLessonCap,
                      ),
                      lessons_done: doneSoFar,
                      ...lessonPurchaseContinuationParams(gateModal.lessonNum),
                    });
                  },
                },
                {
                  label: triLang(lang, {
                    ru: "Пока нет",
                    en: "Not yet",
                    uk: "Поки ні",
                    es: "Ahora no",
                    "pt-BR": "Agora não",
                    vi: "Để sau",
                    id: "Nanti saja",
                    tr: "Şimdilik hayır",
                    pl: "Jeszcze nie",
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
    </>
  );
}

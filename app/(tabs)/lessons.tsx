import { useTabTopBleedInset } from "../../components/tab_top_bleed";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, ScrollView, TextInput } from "react-native";
import Reanimated, { withSpring, Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import TapScale from "../../components/TapScale";
import { useFocusEffect, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useFeatureAccess, usePremium } from "../../components/PremiumContext";
import { comboGateDecision } from "../combo_gate_decision";
import {
  FREE_LESSON_LIMIT,
  buildPremiumLessonUnlocks,
  buildSequentialFreeLessonUnlocks,
  lessonPaywallContext,
  requiresPremiumForLesson,
  resolveLessonAccess,
  resolveLessonEntitlementReadiness,
} from "../monetization_policy";
import { applyDevAsFreeToLessonAccess } from "../dev_as_free_flag";
import { LEVEL_EXAM_UNLOCK_LESSON_PERCENT, allLessonScoresMeetPercent } from "../lesson_star_scale";
import { openPremiumPaywall } from "../paywall_navigation";
import { lessonPurchaseContinuationParams } from "../paywall_lesson_continuation";
import { HOME_BACK_FALLBACK, safeRouterBack } from "../navigation_back";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from "../account_generation";
import {
  getRunesBalanceRead,
  noteCoinDisplay,
  peekDisplayedRunes,
  peekRunes,
  subscribeDisplayedRunes,
} from "../runes_system";
import { useLessonsCoinPillValueV1 } from "../lessons_coin_pill_fallback";
import { projectDevLessonAccess } from "../dev_plus_controls";
import { useTabFocusTick, useTabNav } from "../TabContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../components/ThemeContext";
import { useLang } from "../../components/LangContext";
import { useStudyTarget } from "../../components/StudyTargetContext";
import ScreenGradient from "../../components/ScreenGradient";
import { useTopFadeScroll } from "../../components/TopFadeScrollContext";
import { useBouncy, useBouncyStyle } from "../../components/BouncyScrollView";
import { LinearGradient } from "../../components/SafeLinearGradient";
import ListTopEdgeFade from "../../components/lessons/ListTopEdgeFade";
import { triLang } from "../../constants/i18n";
import { liquidGlassTokens, type GlassTokens } from "../../constants/liquidGlassThemePalette";
import { perfR1BodyMark, perfR1BodyStart, usePerfR1Probe } from "../perf_r1_probe";
import { isOnboardingDeferActive } from "../onboarding_defer_gate";
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
  CLASSIC_LESSONS_GUTTER,
  LessonsListLevelHeader,
} from "../../components/lessons/LessonsListGlassKit";
import { GOLD_RICH } from "../../constants/goldTheme";
import { type ThemeMode } from "../../constants/theme";
import { DEV_CONTENT_UNLOCK } from "../config";
import { hapticTap } from "../../hooks/use-haptics";
import { useReduceMotionPreference } from "../../hooks/use_reduce_motion";
import { useTabContentBottomPad } from "../../hooks/use-tab-content-bottom-pad";
import { useTabRetapScrollTop } from "../../hooks/use_tab_retap_scroll_top"; // зачем (удобство №1): повторный тап по вкладке «Уроки» — наверх
import { useRuntimeActive } from "../../hooks/use_runtime_active";
import { useMyCoinRankBinding } from "../../hooks/use_my_coin_rank";
import { soundDirector } from "../../modules/audio/sound_director";
import { prefetchLessonMenuCache } from "../lesson_menu";
import { navOnce } from "../nav_once"; // зачем (аудит Optimistic UI Уроков, 13.10): двойной тап по карточке урока
import ReportErrorButton from "../../components/ReportErrorButton";
import {
  noteLessonsFirstFrame,
  noteLessonsLeave,
  noteLessonsModuleReady,
  noteLessonsStage,
} from "../lessons_tab_diagnostics";
import { LessonsGateDialog } from "../../components/lessons/LessonsGateDialog";
import { LUM } from "../../constants/motionHybrid";
import { pickLessonsExamStatus } from "../lessons_exam_status";
import PressableHybrid from "../../components/PressableHybrid";
import EnergyBar from "../../components/EnergyBar";
import { useEnergy } from "../../components/EnergyContext";
import DialogsTabContent from "../../components/DialogsTabContent";
import PlusBadge from "../../components/PlusBadge";
import { nestedBoxShadow, plateBoxShadow } from "../../components/v2/ShadowSurface";
import { isAiDialogEnabled } from "../ai_dialog_flags";
import {
  COURSE_LEVEL_RANGES,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  getPreviousCourseLevel,
  type CourseLevel,
} from "../course_levels";
import { lessonNamesForStudyTarget } from "../lesson_titles_for_study_target";
import { noteClassicLessonsShown, noteClassicTap } from "../lessons_access_diagnostics";
import { rememberLessonListDecision, openLessonPremiumPaywall } from "../lesson_premium_gate";
import { useCourseLanguageLocked } from "../use_course_language_locked";
import { examContentAvailableForTarget, frenchExamGateCopy } from "../exam_target_gate";
import { storageStudyTarget } from "../target_storage_keys";
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
  type LessonsTabSnapshot,
} from "../lessons_tab_state";
import { useStableSafeAreaInsets } from "../stable_safe_area_metrics";
import { peekCurrentExamBestPct } from "../exam_best_pct_overlay";
import { isValidCoinRank } from "../coin_rank_table_v1";
import { coinRankDisplaySource } from "../../components/coins/coin_rank_display";
// зачем: клиент сессии тянет манифест на 1,17 МБ (аудит 20.09, замер по логам:
// открытие раздела держало JS-тред 2612 мс и тапы не доходили). Он нужен только
// при подготовке занятия — грузим лениво, тип импортируем отдельно (тип
// стирается при сборке и веса не добавляет).
import { accentGraphicOf } from '../../constants/themeAccentRoles';
import BackGlyph from '../../components/v2/BackGlyph';

import { noteBackArrived, noteBackDecision, noteBackTap } from "../back_tap_probe";
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
const CLASSIC_SEARCH_LAYOUT = LinearTransition.duration(LUM.contentMs).easing(Easing.inOut(Easing.quad));
const CLASSIC_SEARCH_ENTER = FadeIn.duration(LUM.heroFadeMs);
const CLASSIC_SEARCH_EXIT = FadeOut.duration(LUM.heroFadeMs);

// ── Главный компонент ─────────────────────────────────────────────────────────
type LessonsTabProps = {
  overlayIdentityEpoch?: number;
  presentation?: "tab" | "push";
};

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
    // зачем (координатор 25.10): возврат на вкладку показывал закэшированное число прошлого показа (могло отстать от Главной);
    // тот же владелец и поколение → сразу текущий единый показ, иначе — кэш как раньше.
    setBinding((prev) => {
      const base = prev && prev.ownerStableId === ownerStableId && prev.accountGeneration === token.generation ? prev : cachedLegacyCoinBinding(token);
      return base ? Object.freeze({ ...base, balance: peekDisplayedRunes() }) : base;
    });

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
      // зачем (координатор 25.10, «одно число монет»: Главная 690 / «Обучение» 1000 / Главная+Пик 1110): чтение с диска здесь только
      // подтверждает владельца и будит восстановление; на плашку идёт единый показ runes_system — снимок + ожидающие Пика.
      const shownCoins = peekDisplayedRunes();
      console.log('[COIN-PILL]', JSON.stringify({ screen: 'lessons', source: 'durable_read→displayed', durable: read.wallet.balance, value: shownCoins, quality: read.quality, hasAccount: ownerStableId.length > 0, generation: token.generation })); // guard-ok: временная трассировка (координатор 15.10)
      const durable = Object.freeze({
        ownerStableId,
        accountGeneration: token.generation,
        balance: shownCoins,
      });
      lastDurableLegacyCoinBinding = durable;
      setBinding(durable);
    }).catch(noteSwallowedHandler('lessons:useEffect.getRunesBalanceRead'));

    // зачем (координатор 25.10): подписка на единый показ — кошелёк И ожидающие Пика; прежняя подписка на снимок ожидающих не видела.
    const unsubscribeSnapshot = subscribeDisplayedRunes((shownCoins) => {
      if (!alive
        || !durableReadValidated
        || !isCurrentAccountGeneration(token, ownerStableId)) return;
      const refreshed = Object.freeze({
        ownerStableId,
        accountGeneration: token.generation,
        balance: shownCoins,
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

// зачем (координатор 29.10, пустой экран ~8 с на холодном старте): модуль вкладки загружен — в журнал обращений (мс от тапа, если тап уже был).
noteLessonsModuleReady();

export default function LessonsTab({
  overlayIdentityEpoch: _overlayIdentityEpoch = 0,
  presentation = "push",
}: LessonsTabProps = {}) {
  void _overlayIdentityEpoch;
  const perfBodyStart = perfR1BodyStart('lessons'); // зачем (R1): где в теле экрана уходит время — контрольные точки [PERF-R1-BODY], только dev
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 8));
  useMemHomeRegisterSources('lessons_instance'); // зачем ([MEM-HOME] 18.10, R129): живые экземпляры «Обучения»; dev, в релизе пусто
  useEffect(() => {
    // зачем (координатор 13.10, B1: «Уроки» собираются под онбордингом ≈9 с входа): журнал — смонтирована ли вкладка при открытом онбординге; после правки ждём onboardingActive=false
    console.log("[LESSONS-REBUILD] lessons_tab_mounted", JSON.stringify({ instanceId: instanceIdRef.current, presentation, onboardingActive: isOnboardingDeferActive(), atMs: Date.now() }));
    return () => {
      console.log("[LESSONS-REBUILD] lessons_tab_unmounted", JSON.stringify({ instanceId: instanceIdRef.current, onboardingActive: isOnboardingDeferActive() }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // зачем (координатор 29.10): первая отрисовка вкладки после тапа — этап в журнал обращений (в фоне без тапа — только консоль)
  useEffect(() => { noteLessonsStage("first_render"); }, []);
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
  const reduceMotionPreference = useReduceMotionPreference();
  const insets = useStableSafeAreaInsets();
  const listBottomPad = isRetainedTab
    ? tabContentBottomPad
    : Math.max(insets.bottom, 12) + 20;
  // зачем (владелец 22.10, схема eab9aa35d): при полноэкранной странице «Уроки» (Сезон) оболочка не отступает на высоту часов — шапка отступает сама на tabBleed
  const tabBleed = useTabTopBleedInset();
  const headerTopPad = isRetainedTab ? 12 + tabBleed : insets.top + 12;
  const isGoldTheme = themeMode === "gold";
  const screenTitleColor = t.textPrimary;
  perfR1BodyMark('lessons', 'c_lang', perfBodyStart);
  const { lang, s } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (владелец 04.11): язык без прогресса у нового пользователя — Plus; список показывает замок сразу, а не пейвол на тапе (вердикт из course_language_access)
  const courseLanguageLocked = useCourseLanguageLocked(studyTarget);
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
    accessResolved,
    reload: reloadPremiumAccess,
  } = usePremium();
  const premiumCourseActive = accessResolved && isPremium;
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
  useTabRetapScrollTop(1, (animated) => scrollRef.current?.scrollToOffset?.({ offset: 0, animated }));
  const {
    GestureWrap: BouncyWrap,
    stretch: bouncyStretch,
    onBouncyScroll,
  } = useBouncy({ androidGestureDetectorEnabled: false });
  perfR1BodyMark('lessons', 'g_bouncy', perfBodyStart);
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const lessonsTabVisible = isRetainedTab && runtimeOwnerId === "lessons";
  const lessonsRuntimeActive = useRuntimeActive(
    isRetainedTab ? lessonsTabVisible : true,
  );

  // Карта раскрывается прямо под выбранной плашкой; одновременно открыта одна.
  const dialogsEnabled = isAiDialogEnabled();
  // зачем (R92): курс V2 — только при языке интерфейса с пояснениями курса (ru/uk); [V2-LOCALE-GATE] пишет решение при смене языка.
  const [page, setPage] = useState<"lessons" | "dialogs">("lessons");
  // R08: navFocused — фокус экрана вкладок в корневом стеке (freezeOnBlur замораживает нативный кадр расфокусированного экрана)
  const navFocused = useIsFocused();
  // зачем (координатор 28.10, события диагностики обращений): вкладка стала видимой и в фокусе — через кадр это «первый кадр» после тапа (мс от тапа →
  // корзина lt1s | 1to3s | 3to8s | gt8s); перестала быть видимой — неявный уход tab_switch (явные причины back_button / hidden_tab_redirect / tab_bar_tap
  // пишутся раньше и перекрывают его в пределах 1,5 с).
  const lessonsShownRef = useRef(false);
  useEffect(() => {
    if (!isRetainedTab) return undefined;
    const shown = lessonsTabVisible && navFocused;
    const wasShown = lessonsShownRef.current;
    lessonsShownRef.current = shown;
    if (shown && !wasShown) {
      const frame = requestAnimationFrame(() => noteLessonsFirstFrame());
      return () => cancelAnimationFrame(frame);
    }
    if (!shown && wasShown) noteLessonsLeave("tab_switch", { visible: lessonsTabVisible, focused: navFocused });
    return undefined;
  }, [isRetainedTab, lessonsTabVisible, navFocused]);
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
  // зачем (Сверка 25.10, холодный старт «—»): до подтверждения пилюля показывает последнее число общего показа Ядра, без пустого кадра
  const coinPill = useLessonsCoinPillValueV1(legacyCoinBalance);
  // зачем (координатор 15.10, «Обучение» 0 при Главной 53): что показывает плашка и почему — привязка баланса, ранга и их совпадение
  useEffect(() => {
    console.log('[COIN-PILL]', JSON.stringify({
      screen: 'lessons',
      source: legacyCoinBalanceBinding ? 'wallet_cache' : 'none',
      shown: coinPill.value ?? '—',
      pillSource: coinPill.source,
      value: legacyCoinBalanceBinding?.balance ?? null,
      snapshotValue: peekRunes(),
      displayedValue: peekDisplayedRunes(),
      trusted: legacyCoinProjectionTrusted,
      hydrated: legacyCoinBalanceBinding !== null,
      // зачем (координатор 15.10): без идентификатора аккаунта в журнале — только поколение и совпадение владельца баланса и ранга
      rankGeneration: legacyCoinRankBinding?.accountGeneration ?? null,
      rankSameOwner: legacyCoinRankBinding && legacyCoinBalanceBinding ? legacyCoinRankBinding.ownerStableId === legacyCoinBalanceBinding.ownerStableId : null,
      balanceGeneration: legacyCoinBalanceBinding?.accountGeneration ?? null,
    })); // guard-ok: временная трассировка
    if (legacyCoinBalance !== null) noteCoinDisplay('lessons', legacyCoinBalance);
  }, [coinPill.source, coinPill.value, legacyCoinBalance, legacyCoinBalanceBinding, legacyCoinProjectionTrusted, legacyCoinRankBinding]);
  // зачем (Ревизор 3.120): монета 20 dp в шапке — копия 96² вместо исходника 768².
  const legacyCoinRankSource = isValidCoinRank(legacyCoinRank)
    ? coinRankDisplaySource(legacyCoinRank, 20)
    : null;
  // зачем (владелец 17.10: «этот модал удаляй полностью, он не нужен!!!»): окно «Пропуск основателя» удалено целиком —
  // гейт, квитанция «видел», ник пропуска. Карта и прогрев занятия от него больше не зависят. Ключи квитанции в AsyncStorage не трогаем.
  const [legacySearchExpanded, setLegacySearchExpanded] = useState(false);
  const legacySearchLayout = reduceMotionPreference === false ? CLASSIC_SEARCH_LAYOUT : undefined;
  const legacySearchEnter = reduceMotionPreference === false ? CLASSIC_SEARCH_ENTER : undefined;
  const legacySearchExit = reduceMotionPreference === false ? CLASSIC_SEARCH_EXIT : undefined;
  const [legacyLessonQuery, setLegacyLessonQuery] = useState("");
  const handleLessonsBack = useCallback(() => {
    noteBackTap(page === "dialogs" ? "dialogs" : "legacy_lessons", "header_back_button", { page, isRetainedTab });
    if (page === "dialogs") {
      noteBackDecision("dialogs → lessons");
      setPage("lessons");
      return;
    }
    if (isRetainedTab) {
      noteBackDecision("tab_legacy_list → goHome");
      noteLessonsLeave("back_button", { page: "legacy_list" });
      goHome();
      return;
    }
    noteBackDecision("push_legacy_list → safeRouterBack");
    safeRouterBack(router, HOME_BACK_FALLBACK as any);
  }, [goHome, isRetainedTab, page, router]);
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
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    void loadScores();
  }, [focusTick, isRetainedTab, lessonsTabVisible, loadScores]);
  perfR1BodyMark('lessons', 'before_lessons_memo', perfBodyStart);
  const lessons = useMemo(() => lessonNamesForStudyTarget(lang, studyTarget), [lang, studyTarget]);
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
    if (premiumCourseActive) {
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
    premiumCourseActive,
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
        kind: "exam";
        level: CourseLevel;
      }
    | {
        kind: "attestation";
      };
  perfR1BodyMark('lessons', 'before_list_data', perfBodyStart);
  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
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
  }, [lang, lessons, themeMode, levelInkGlass]);
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
  const legacySearchLabel = triLang(lang, {
    ru: "Поиск по урокам", uk: "Пошук за уроками", en: "Search lessons",
    es: "Buscar lecciones", "pt-BR": "Buscar lições", vi: "Tìm bài học",
    id: "Cari pelajaran", tr: "Derslerde ara", pl: "Szukaj lekcji",
  });
  // зачем (владелец 2026-09-17): вход в «комбинированный урок» — несколько тем
  // вперемешку. Гейт Plus/Pro стоит ЗДЕСЬ, до перехода: выбор тем — платная
  // механика, и показывать экран, с которого нельзя стартовать, значит обмануть.
  // Решение берём из общей tri-state границы: unknown не является ни Plus, ни
  // Free — остаёмся на месте и просим PremiumContext повторить проверку.
  const openCombinedLesson = useCallback(() => {
    hapticTap();
    const decision = comboGateDecision({
      comboActive: true,
      hasPremiumAccess: isPremium,
      accessResolved,
    });
    if (decision === 'pending') {
      if (__DEV__) console.log('[COMBO-ENTRY] press:pending', JSON.stringify({ isPremium, accessResolved }));
      void reloadPremiumAccess();
      return;
    }
    if (decision === 'deny') {
      // зачем: ранний выход обязан называть причину (правило «сперва логи»).
      if (__DEV__) console.log('[COMBO-ENTRY] press:denied', JSON.stringify({ isPremium, accessResolved }));
      openPremiumPaywall(router, { context: "combined_lesson" });
      return;
    }
    if (__DEV__) console.log('[COMBO-ENTRY] press:ok → /combined_lesson_pick');
    if (!navOnce('lessons:combined_pick')) return; // зачем (аудит R58 #17, 15.10): двойной тап — один экран выбора
    router.push('/combined_lesson_pick');
  }, [accessResolved, isPremium, reloadPremiumAccess, router]);
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
  // зачем (координатор 28.10, жалобы #3 uk «натискаю на класичні уроки і уроків немає», #1 ru «не полностью открывается старый
  // курс», сперва логи): одна строка на показ классического списка — сколько уроков должно быть, сколько строк собрано и показано,
  // какой шаг отрезал (поиск) и сколько уроков открыто. console.* в прод-сборке вырезается (babel.config.js, кроме
  // warn/error) — итог уходит событием журнала обращений (app/lessons_access_diagnostics.ts), одно событие на смену итога.
  useEffect(() => {
    if (!lessonsTabVisible) return;
    noteClassicLessonsShown({
      cutBy: lessons.length === 0 ? "no_titles" : listData.length === 0 ? "list_not_built" : legacyFilteredListData.length === 0 ? "search" : "none",
      queryActive: legacyLessonQuery.trim().length > 0,
      shownLessons: legacyFilteredListData.filter((item) => item.kind === "lesson").length,
      unlocked: unlockedLessons.filter(Boolean).length,
      done: progCounts.filter((count) => (count ?? 0) >= 50).length,
      isPremium,
    });
  }, [isPremium, legacyFilteredListData, legacyLessonQuery, lessons.length, lessonsTabVisible, listData.length, progCounts, unlockedLessons]);
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
      const entitlementReadiness = resolveLessonEntitlementReadiness({
        lessonId: num,
        isPremium: accessInput.isPremium,
        accessResolved,
        purchased: accessInput.purchased,
        devMode: accessInput.devMode,
        noLimits: accessInput.noLimits,
        legacyFreeLessonCap: accessInput.legacyFreeLessonCap,
      });
      if (entitlementReadiness === 'pending') {
        void reloadPremiumAccess();
        return;
      }
      // зачем (владелец 04.11): замок дополнительного языка — сразу пейвол «Ещё один язык»; Plus/тестер/dev замок снимают
      if (courseLanguageLocked && !accessInput.isPremium && !accessInput.noLimits && !accessInput.devMode) {
        console.log('[COURSE-LANG-LOCK] list:tap_locked', JSON.stringify({ lesson: num, studyTarget })); // guard-ok: тап по запертому языку
        void openLessonPremiumPaywall(router, num, studyTarget);
        return;
      }
      const access = resolveLessonAccess(accessInput);
      logLessonGateDecision('list', {
        lesson: num, access, isPremium: accessInput.isPremium, devMode: accessInput.devMode ?? false, noLimits: effectiveNoLimits,
        purchased: purchasedLessons.includes(num), unlocked: Boolean(unlockedLessons[num - 1]),
        cap: effectiveLegacyFreeLessonCap ?? null, levelLockedByExam: false,
      });
      // зачем (координатор 28.10, видео 2.0.3: тап по пройденному уроку не открывал меню): решение списка видит меню урока, тап — в журнале обращений
      rememberLessonListDecision(num, access, studyTarget);
      noteClassicTap(num, access, isPremium);
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
      accessResolved,
      courseLanguageLocked,
      isPremium,
      openLessonPaywall,
      purchasedLessons,
      router,
      reloadPremiumAccess,
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
    const examEntitlementReadiness = resolveLessonEntitlementReadiness({
      lessonId: to,
      isPremium,
      accessResolved,
      devMode: effectiveDevContentUnlock,
      noLimits: effectiveNoLimits,
      legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
    });
    const examEntitlementPending = examEntitlementReadiness === 'pending';
    const premiumExamAvailable =
      premiumCourseActive && examLevelIdx <= premiumReachableLevelIndex;
    const examPremiumRequired = examEntitlementReadiness === 'premium_required';
    const examSourceAvailable = examContentAvailableForTarget(studyTarget);
    const allDone =
      examSourceAvailable &&
      !examEntitlementPending &&
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
      result, examPremiumRequired, examSourceAvailable, allDone, isPremium: premiumCourseActive, prevExamLevel,
    });
    const subLine = examEntitlementPending
      ? lessonsListCopy.checkingAccess(lang)
      : examStatusKind === "passed" || examStatusKind === "almost"
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
      examSourceAvailable, allDone, examEntitlementPending, examPremiumRequired, isPremium: premiumCourseActive, kind: examStatusKind, chosen: subLine,
    });
    // зачем (R1 L1): свежий обработчик кладём в ref, а в плашку отдаём стабильную обёртку — ссылка пропса не меняется между коммитами.
    examPressImplRef.current[lvl] = () => {
      markLessonsGateTap();
      hapticTap();
      const firstLessonByLevel =
        lvl === "A1" ? 1 : lvl === "A2" ? 9 : lvl === "B1" ? 19 : 29;
      if (examEntitlementReadiness === 'pending') {
        void reloadPremiumAccess();
      } else if (examPremiumRequired) {
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
      } else if (premiumCourseActive && prevExamLevel) {
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
  const renderLessonCard = ({ index, name }: { index: number; name: string }): React.ReactNode => {
    const num = index + 1;
    // зачем (владелец 2026-09-30): старый каталог «Обучение» рисуется стеклянной карточкой
    // `.lc` из learn.html. Состояние считается из тех же данных, что и прежняя плашка
    // (unlockedLessons, progCounts, requiresPremiumForLesson), — доступ не меняется.
    const legacyUnlocked = Boolean(unlockedLessons[index]);
    const legacyPct = Math.min(100, Math.round(((progCounts[index] ?? 0) / 50) * 100));
    const legacyEntitlementReadiness = resolveLessonEntitlementReadiness({
      lessonId: num,
      isPremium,
      accessResolved,
      purchased: purchasedLessons.includes(num),
      devMode: effectiveDevContentUnlock,
      noLimits: effectiveNoLimits,
      legacyFreeLessonCap: effectiveLegacyFreeLessonCap,
    });
    // зачем (владелец 04.11): запертый язык рисуется Plus-замком, даже если урок «открыт» по прогрессу другого языка
    const legacyLanguageLocked = courseLanguageLocked && !isPremium && !effectiveNoLimits && !effectiveDevContentUnlock;
    const legacyPremiumRequired =
      legacyLanguageLocked ||
      (legacyEntitlementReadiness === 'premium_required' &&
      !legacyUnlocked &&
      !effectiveNoLimits);
    const legacyState: LessonsListCardState = legacyEntitlementReadiness === 'pending'
      ? { kind: "pending" }
      : legacyPremiumRequired
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
  };

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
          ru: `Монеты: ${coinPill.value ?? "не загружены"}`,
          en: `Coins: ${coinPill.value ?? "not loaded"}`,
          uk: `Монети: ${coinPill.value ?? "не завантажені"}`,
          es: `Monedas: ${coinPill.value ?? "sin cargar"}`,
          "pt-BR": `Moedas: ${coinPill.value ?? "não carregadas"}`,
          vi: `Xu: ${coinPill.value ?? "chưa tải"}`,
          id: `Koin: ${coinPill.value ?? "belum dimuat"}`,
          tr: `Jetonlar: ${coinPill.value ?? "yüklenmedi"}`,
          pl: `Monety: ${coinPill.value ?? "nie wczytano"}`,
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
          {coinPill.value === null ? "—" : String(coinPill.value)}
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
      <ScreenGradient forceFullBleed bleedTop={isRetainedTab && tabBleed === 0 ? insets.top : 0}>
        {/* зачем (владелец 18.10 «верхняя зона ТОЧНО как на Главной, особо — Уроки»): свой слой bgTop → bg → bgBottom поверх полотна убран —
            под Уроками ровно то же полотно (V2Backdrop), что под Главной, один источник фона на все вкладки. */}
        <View
          style={{
            flex: 1,
            backgroundColor: "transparent",
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

              <EnergyBar size={30} ownerActive={lessonsRuntimeActive} />
            </View>
          </View>

          {/* Переключатель страниц: Уроки | Диалоги */}
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
                paddingHorizontal: CLASSIC_LESSONS_GUTTER,
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
                {!isRetainedTab ? (
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

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: CLASSIC_LESSONS_GUTTER,
                marginTop: 12,
              }}
            >
              <Reanimated.View
                layout={legacySearchLayout}
                collapsable={false}
                style={{ height: 40, borderRadius: 20, overflow: "hidden", minWidth: 0, ...(legacySearchExpanded ? { flex: 1 } : { width: 40 }) }}
              >
                {legacySearchExpanded ? (
                  <Reanimated.View
                    entering={legacySearchEnter}
                    exiting={legacySearchExit}
                    testID="legacy-lessons-search-field"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 40,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 14,
                      backgroundColor: learnGlass.plateFillFrom,
                      boxShadow: plateBoxShadow(learnGlass), // зачем («Тень» 12.10): поле поиска — плашка без кромки
                    }}
                  >
                    <Ionicons name="search" size={18} color={learnGlass.secondary} />
                    <TextInput
                      testID="legacy-lessons-search-input"
                      autoFocus
                      value={legacyLessonQuery}
                      onChangeText={setLegacyLessonQuery}
                      returnKeyType="search"
                      accessibilityLabel={legacySearchLabel}
                      placeholder={triLang(lang, {
                        ru: "Урок или тема", uk: "Урок або тема", en: "Lesson or topic",
                        es: "Lección o tema", "pt-BR": "Lição ou tema", vi: "Bài học hoặc chủ đề",
                        id: "Pelajaran atau topik", tr: "Ders veya konu", pl: "Lekcja lub temat",
                      })}
                      placeholderTextColor={learnGlass.secondary}
                      selectionColor={learnGlass.text}
                      style={{ flex: 1, minWidth: 0, color: learnGlass.text, fontSize: 16, padding: 0 }}
                    />
                    <TouchableOpacity
                      testID="legacy-lessons-search-close"
                      accessibilityRole="button"
                      accessibilityLabel={triLang(lang, {
                        ru: "Закрыть поиск", uk: "Закрити пошук", en: "Close search",
                        es: "Cerrar búsqueda", "pt-BR": "Fechar busca", vi: "Đóng tìm kiếm",
                        id: "Tutup pencarian", tr: "Aramayı kapat", pl: "Zamknij wyszukiwanie",
                      })}
                      onPress={() => {
                        hapticTap();
                        setLegacyLessonQuery("");
                        setLegacySearchExpanded(false);
                      }}
                      hitSlop={6}
                      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="close" size={18} color={learnGlass.secondary} />
                    </TouchableOpacity>
                  </Reanimated.View>
                ) : (
                  <TouchableOpacity
                    testID="legacy-lessons-search-toggle"
                    accessibilityRole="button"
                    accessibilityState={{ expanded: false }}
                    accessibilityLabel={legacySearchLabel}
                    onPress={() => setLegacySearchExpanded(true)}
                    hitSlop={4}
                    style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="search" size={20} color={learnGlass.text} />
                  </TouchableOpacity>
                )}
              </Reanimated.View>

              {/* Ряд листается, только если кнопкам тесно (крупный шрифт/узкий экран);
                  затухание справа появляется лишь тогда — иначе оно ложилось бы полосой
                  на фон темы. */}
              <Reanimated.View layout={legacySearchLayout} style={{ flexShrink: 0 }}>
                <ScrollView
                  horizontal
                  testID="legacy-lessons-level-rail"
                  keyboardShouldPersistTaps="handled"
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
                    // зачем (аудит кнопок 22.10, C2): круг 40 — зона нажатия до 44
                    hitSlop={2}
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
              </Reanimated.View>
            </View>

          <ListTopEdgeFade>
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
                keyboardShouldPersistTaps="handled"
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
                        variant="icon-flag"
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
                  if (item.kind === "attestation") {
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
                      accessResolved &&
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
                }}
              />
            </BouncyWrap>
          </ListTopEdgeFade>
          </View>

        </View>
        </View>
      </ScreenGradient>
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

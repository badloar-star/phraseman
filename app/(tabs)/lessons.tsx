import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Reanimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withDelay,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import TapScale from '../../components/TapScale';
import { useRouter } from 'expo-router';
import { useFeatureAccess, usePremium } from '../../components/PremiumContext';
import { FREE_LESSON_LIMIT, buildSequentialFreeLessonUnlocks, lessonPaywallContext, requiresPremiumForLesson, resolveLessonAccess } from '../monetization_policy';
import { openPremiumPaywall } from '../paywall_navigation';
import { lessonPurchaseContinuationParams } from '../paywall_lesson_continuation';
import { useTabNav } from '../TabContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import ScreenGradient from '../../components/ScreenGradient';
import { useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { useBouncy, useBouncyStyle } from '../../components/BouncyScrollView';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { triLang, type Lang } from '../../constants/i18n';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldCardGradient, goldCefrAccent, goldShadow } from '../../constants/goldTheme';
import { getLessonExamIcon } from '../../constants/generatedThemeIconAssets';
import type { ThemeMode } from '../../constants/theme';
import GoldBevel from '../../components/GoldBevel';
import { DEV_CONTENT_UNLOCK, ENABLE_DEV_TOOLS } from '../config';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { getExamMedalTier, getEarnedDots } from '../medal_utils';
import { prefetchLessonMenuCache } from '../lesson_menu';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedChoiceModal from '../../components/ThemedChoiceModal';
import EnergyBar from '../../components/EnergyBar';
import DialogsTabContent from '../../components/DialogsTabContent';
import PlusBadge from '../../components/PlusBadge';
import { isAiDialogEnabled } from '../ai_dialog_flags';
import { readPersonalPlanState } from '../personal_plan_state';
import { COURSE_LEVEL_RANGES, getCourseLevelForLesson, getCourseLevelIndex, getPreviousCourseLevel, type CourseLevel, } from '../course_levels';
import { lessonNamesForStudyTarget } from '../lesson_titles_for_study_target';
import { examContentAvailableForTarget, frenchExamGateCopy } from '../exam_target_gate';
import {
    storageStudyTarget,
} from '../target_storage_keys';
import {
    getLessonsTabInitialState,
    loadLessonsTabStateFromStorage,
    type LessonsTabSnapshot,
} from '../lessons_tab_state';
import { getHomeMenuImages } from '../home_menu_icons';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
// зачем: владелец заменил старый хекс-макет V2 на лабораторию всех режимов Learning V2
// (тест каждого режима руками до прод-контента).
import LearningV2ModesLab from '../../components/learning-v2-lab/LearningV2ModesLab';
import { peekCurrentExamBestPct } from '../exam_best_pct_overlay';
/** Снимок UI списку уроків: survives remount між сесіями таба (див. `_layout.tsx` lazy tabs). */
let lessonsUiSessionCacheByTarget: Partial<Record<string, LessonsTabSnapshot>> = {};
/**
 * Единый стиль карточек списка уроков (как «Туман» / «Графит»).
 * Объявлено на уровне модуля (не внутри компонента): имя начинается с `use` — внутри функции
 * Metro/Hermes + Fast Refresh иногда дают «Property 'useSketchLessonVisual' doesn\'t exist».
 */
export const useSketchLessonVisual = true;
const USE_ELITE_LESSONS_MAP = true;
// ── Список уроков: один стиль «Туман / Графит» (мягкие заливки + чернила) во всех темах приложения ──
const PALETTE_SKETCH: Record<string, string> = {
    A1: '#D4CCBC',
    A2: '#C5BBA8',
    B1: '#B4AA9A',
    B2: '#A19D95',
};
const PALETTE_CORAL: Record<string, string> = {
    A1: '#F1B2A9',
    A2: '#EAA08F',
    B1: '#E0AE83',
    B2: '#D98B99',
};
const LESSON_LEVEL_PALETTES: Record<string, Record<string, string>> = {
    dark: {
        A1: '#B8D6B8',
        A2: '#A7CFB0',
        B1: '#C6D79B',
        B2: '#96BEA0',
    },
    gold: {
        A1: '#F2DFA5',
        A2: '#E6C878',
        B1: '#D0A95B',
        B2: '#B88A45',
    },
    coral: PALETTE_CORAL,
    minimalDark: {
        A1: '#D7E7FF',
        A2: '#6EA8FF',
        B1: '#9CA3AF',
        B2: '#A78BFA',
    },
    // ─── «Чёрное кино» (midnight/ember/aurora/volt) ──────────────────────────
    // Обложки уроков в тон спектру каждой темы (см. constants/cinemaThemes.ts):
    // 4 «голоса» спектра на A1→B2, светлые и насыщенные (далее darkenHex красит
    // фон карточки, lessonAccent=bg — обводку/текст/прогресс). Та же логика, что
    // у dark (Форест) / coral (Корал) / minimalDark (Графит).
    midnight: {
        A1: '#8FA0FF', // accent — электрик-синий
        A2: '#B79CFF', // second — сине-фиолетовый
        B1: '#FFD27A', // gold   — тёплый контраст (как у Форест на B1)
        B2: '#A95BFF', // bloomB — финальный фиолет
    },
    ember: {
        A1: '#FFA245', // accent — янтарь
        A2: '#FFC894', // second — светлый янтарь
        B1: '#5FE8A8', // correct — мятный контраст
        B2: '#FF3D6E', // bloomB — малиновый закат
    },
    aurora: {
        A1: '#3DE8A6', // accent — мята
        A2: '#9FF2D4', // second — светлая мята
        B1: '#F2D27A', // gold   — тёплый контраст
        B2: '#2E9DFF', // bloomB — лазурь
    },
    volt: {
        A1: '#D6FF3D', // accent — лайм
        A2: '#EAFF8C', // second — светлый лайм
        B1: '#4FE8AC', // correct — изумрудный контраст
        B2: '#2EE08C', // bloomB — зелёный
    },
};
const EXAM_META_SKETCH: Record<string, {
    bg: string;
    accent: string;
}> = {
    A1: { bg: '#3F3D39', accent: '#F3F0E8' },
    A2: { bg: '#353638', accent: '#ECEFF3' },
    B1: { bg: '#2C3035', accent: '#E5E9EF' },
    B2: { bg: '#242932', accent: '#EEF2F8' },
};
const EXAM_META_CORAL: Record<string, {
    bg: string;
    accent: string;
}> = {
    A1: { bg: '#4B3432', accent: '#F8E1DC' },
    A2: { bg: '#4A352E', accent: '#F6DDD2' },
    B1: { bg: '#4A3B2E', accent: '#F6E6D3' },
    B2: { bg: '#432C34', accent: '#F6DDE5' },
};
const EXAM_META_BY_THEME: Record<string, typeof EXAM_META_SKETCH> = {
    minimalDark: {
        A1: { bg: '#1D2636', accent: '#D7E7FF' },
        A2: { bg: '#161F2E', accent: '#6EA8FF' },
        B1: { bg: '#171B24', accent: '#9CA3AF' },
        B2: { bg: '#151827', accent: '#A78BFA' },
    },
    dark: {
        A1: { bg: '#344637', accent: '#E2F4E3' },
        A2: { bg: '#304333', accent: '#DDF2E1' },
        B1: { bg: '#41472D', accent: '#F0F7D7' },
        B2: { bg: '#2F3F34', accent: '#D9EFDF' },
    },
    coral: EXAM_META_CORAL,
    // ─── «Чёрное кино» — плашки зачётов в тон спектру (см. cinemaThemes.ts) ───
    // bg: тёмная подложка с подтоном спектра; accent: светлый голос спектра.
    midnight: {
        A1: { bg: '#1B1F36', accent: '#C9D2FF' },
        A2: { bg: '#232948', accent: '#D8CCFF' },
        B1: { bg: '#2A2B3F', accent: '#FFE3B0' },
        B2: { bg: '#26203F', accent: '#D9B5FF' },
    },
    ember: {
        A1: { bg: '#281B10', accent: '#FFD9A8' },
        A2: { bg: '#332215', accent: '#FFE6C9' },
        B1: { bg: '#1F2A1C', accent: '#BFF5DA' },
        B2: { bg: '#33161F', accent: '#FFB5C4' },
    },
    aurora: {
        A1: { bg: '#15241C', accent: '#9FF2CF' },
        A2: { bg: '#1C2F24', accent: '#C7F7E5' },
        B1: { bg: '#2A2A1C', accent: '#F7E6B0' },
        B2: { bg: '#162636', accent: '#A8D8FF' },
    },
    volt: {
        A1: { bg: '#20250E', accent: '#EFFF9E' },
        A2: { bg: '#2A3013', accent: '#F4FFC4' },
        B1: { bg: '#16251C', accent: '#B5F5D8' },
        B2: { bg: '#1A2A1E', accent: '#A8F0C8' },
    },
};
function cefrKey(num: number): string {
    if (num <= 8)
        return 'A1';
    if (num <= 18)
        return 'A2';
    if (num <= 28)
        return 'B1';
    return 'B2';
}
const LESSON_TONE_STEPS = [0.94, 1, 0.97, 1.04, 0.92, 0.99, 1.06, 0.95, 1.02, 0.98];
function scaleHex(hex: string, factor = 1): string {
    const r = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor)));
    const b = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor)));
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
function lessonToneFactor(num: number): number {
    const level = getCourseLevelForLesson(num);
    const [firstLesson] = COURSE_LEVEL_RANGES[level];
    return LESSON_TONE_STEPS[(num - firstLesson) % LESSON_TONE_STEPS.length] ?? 1;
}
function bookPalette(num: number, themeMode = 'minimalDark'): string {
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
    if (!v) { v = darkenHex(hex, factor); _darkenCache.set(k, v); }
    return v;
}
function rgbaHexCached(hex: string, alpha: number): string {
    const k = `${hex}:${alpha}`;
    let v = _rgbaCache.get(k);
    if (!v) { v = rgbaHex(hex, alpha); _rgbaCache.set(k, v); }
    return v;
}
// ── Medal images ────────────────────────────────────────────────────────────
const MEDAL_IMAGES: Record<string, any> = {
    bronze: require('../../assets/images/levels/bronza.webp'),
    silver: require('../../assets/images/levels/serebro.webp'),
    gold: require('../../assets/images/levels/zoloto.webp'),
    ruby: require('../../assets/images/levels/rubin.webp'),
    emerald: require('../../assets/images/levels/izumrud.webp'),
    diamond: require('../../assets/images/levels/almaz.webp'),
};
function MedalDots({ dots }: {
    dots: string[];
}) {
    if (dots.length === 0)
        return null;
    const SIZE = 22;
    const OFFSET = 14;
    const totalW = SIZE + (dots.length - 1) * OFFSET;
    return (<View style={{ width: totalW, height: SIZE }}>
      {dots.map((key, i) => (<Image key={i} source={MEDAL_IMAGES[key]} style={{
                position: 'absolute',
                left: i * OFFSET,
                width: SIZE,
                height: SIZE,
                zIndex: dots.length - i,
            }} contentFit="contain"/>))}
  </View>);
}
function LessonExamThemeIcon({ themeMode, size, label }: {
    themeMode: ThemeMode;
    size: number;
    label: string;
}) {
    return (<Image source={getLessonExamIcon(themeMode)} style={{ width: size, height: size, flexShrink: 0 }} contentFit="contain" accessibilityLabel={label} accessibilityIgnoresInvertColors/>);
}
/**
 * Маленькая золотая плашка «Premium» в правом верхнем углу карточки урока.
 * Показывается только на уроках, закрытых именно за пейволом (premiumRequired),
 * а не за прогрессом/уровнем — там остаётся обычный замочек.
 */
// Высоты элементов (должны точно совпадать с реальным рендером)
const BOOK_H = 72; // высота книги
const LESSON_CARD_WHITE_TEXT_SHADOW = {
    textShadowColor: 'rgba(0,0,0,0.50)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
};
const LESSON_CARD_ACCENT_TEXT_SHADOW = {
    textShadowColor: 'rgba(0,0,0,0.46)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
};
const LESSON_CARD_FILLED_META_TEXT = '#07110A';
const LESSON_CARD_OPEN_META_TEXT = LESSON_CARD_FILLED_META_TEXT;
const LESSON_CARD_ACCENT_EDGE_SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 4,
    elevation: 2,
};

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
function TabUnderlineButton({ label, active, color, mutedColor, accent, fontSize, onPress, badge, badgeColor, badgeTextColor, badgeLabel, plusBadge, plusBadgeLabel, themeMode }: TabUnderlineButtonProps) {
    // Дуга шириной по содержимому: оцениваем по длине надписи (моноширинного API нет).
    const arcWidth = Math.max(44, Math.round(label.length * Math.max(14, fontSize) * 0.62));
    const arcHeight = 9;
    // Квадратичная кривая, прогнутая вниз: концы выше центра → «улыбка».
    const arcPath = `M2 2 Q${arcWidth / 2} ${arcHeight - 1} ${arcWidth - 2} 2`;
    return (
        <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            activeOpacity={0.7}
            onPress={onPress}
            style={{ paddingTop: plusBadge ? 5 : 10, paddingBottom: 12, alignItems: 'center', position: 'relative' }}
        >
            {plusBadge ? (
                <PlusBadge
                    themeMode={themeMode}
                    size="xs"
                    showIcon={false}
                    label={plusBadgeLabel ?? 'Plus'}
                    style={{ alignSelf: 'center', marginBottom: 2 }}
                />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: active ? color : mutedColor, fontSize: Math.max(14, fontSize), fontWeight: active ? '800' : '600' }} numberOfLines={1}>
                    {label}
                </Text>
                {badge && badgeLabel ? (
                    <View style={{ borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: badgeColor ?? accent }}>
                        <Text style={{ color: badgeTextColor ?? '#fff', fontSize: 10, fontWeight: '900' }} maxFontSizeMultiplier={1}>
                            {badgeLabel}
                        </Text>
                    </View>
                ) : null}
            </View>
            {active ? (
                <Svg width={arcWidth} height={arcHeight} viewBox={`0 0 ${arcWidth} ${arcHeight}`} style={{ position: 'absolute', bottom: 2 }}>
                    <Path d={arcPath} stroke={accent} strokeWidth={2.6} strokeLinecap="round" fill="none" />
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
    cardLayerStyle: { position: 'absolute'; left: number; top: number; right: number; bottom: number; borderRadius: number; overflow: 'hidden' };
    lessonTextColor: string;
    lessonMetaColor: string;
    // внешние props из замыкания
    isGoldTheme: boolean;
    isCoralTheme: boolean;
    themeMode: ThemeMode;
    goldSurface: string;
    goldHairline: string;
    goldAntique: string;
    goldBright: string;
    scaleAnim: null;
    lang: Lang;
    f: ReturnType<typeof import('../../components/ThemeContext').useTheme>['f'];
    openLessonPaywall: (lessonNum: number) => void;
    setGateModal: React.Dispatch<React.SetStateAction<null | { kind: 'exam'; level: string } | { kind: 'lesson'; prevNum: number } | { kind: 'levelGate'; level: string; prevLevel: string } | { kind: 'frenchExam'; level: string } | { kind: 'premium'; lessonNum: number }>>;
    router: ReturnType<typeof import('expo-router').useRouter>;
    studyTarget: string;
    isPremium: boolean;
    DEV_CONTENT_UNLOCK: boolean;
    noLimits: boolean;
    legacyFreeLessonCap: number;
    textPrimary: string;
    textMuted: string;
}

const LessonCard = React.memo(function LessonCard({
    num, name, isUnlocked, bg, darkBg, progPct, isComplete, isCurrent,
    lessonLevel, lessonGoldLevel, lessonAccent, prevLessonLevel,
    levelLockedByExam, premiumRequired, showLessonProgressFill,
    cardRadius, lockedCardBaseColor, cardLayerStyle,
    lessonTextColor, lessonMetaColor,
    isGoldTheme, isCoralTheme, themeMode: _themeMode,
    goldSurface: _gs, goldHairline, goldAntique, goldBright,
    scaleAnim, lang, f,
    openLessonPaywall, setGateModal, router, studyTarget,
    isPremium, DEV_CONTENT_UNLOCK, noLimits, legacyFreeLessonCap,
    textPrimary: _tp, textMuted,
}: LessonCardProps) {
    const lockedCardHasLightFill = false;
    const useFilledMetaText = isComplete && showLessonProgressFill;
    const useDarkMetaText = useFilledMetaText || (!isGoldTheme && !isCoralTheme && isUnlocked);
    return (<Animated.View style={{
            marginTop: 5,
            marginHorizontal: 14,
            borderRadius: cardRadius,
            transform: [{ scale: scaleAnim ?? 1 }],
            shadowColor: isGoldTheme ? '#000' : darkenHexCached(bg, isCoralTheme ? 0.18 : 0.28),
            shadowOffset: { width: 0, height: isCurrent ? 7 : isUnlocked ? 4 : 2 },
            shadowOpacity: USE_ELITE_LESSONS_MAP
                ? (isCurrent ? 0.20 : isUnlocked ? 0.11 : 0.05)
                : useSketchLessonVisual ? (isUnlocked ? 0.14 : 0.08) : (isUnlocked ? 0.28 : 0.15),
            shadowRadius: USE_ELITE_LESSONS_MAP
                ? (isCurrent ? 14 : isUnlocked ? 9 : 4)
                : useSketchLessonVisual ? (isUnlocked ? 10 : 5) : (isUnlocked ? 8 : 4),
            elevation: isCurrent ? 8 : isUnlocked ? 6 : 2,
            ...(isGoldTheme ? goldShadow(isCurrent ? 2 : 1) : {}),
            ...({}),
        }}>
      <TouchableOpacity testID={`lessons-row-${num}`} activeOpacity={0.82} onPress={() => {
            hapticTap();
            const access = resolveLessonAccess({
                lessonId: num,
                unlocked: isUnlocked,
                isPremium,
                devMode: DEV_CONTENT_UNLOCK,
                noLimits,
                legacyFreeLessonCap,
            });
            if (access === 'available') {
                void prefetchLessonMenuCache(num, studyTarget);
                router.push({ pathname: '/lesson_menu', params: { id: num } });
            }
            else if (access === 'premium_required') {
                openLessonPaywall(num);
            }
            else if (levelLockedByExam && prevLessonLevel) {
                setGateModal({ kind: 'levelGate', level: lessonLevel, prevLevel: prevLessonLevel });
            }
            else {
                setGateModal({ kind: 'lesson', prevNum: num - 1 });
            }
            }} style={{
            height: BOOK_H,
            borderRadius: cardRadius,
            overflow: 'hidden',
            backgroundColor: isUnlocked ? 'transparent' : lockedCardBaseColor,
            borderWidth: isGoldTheme ? 1 : USE_ELITE_LESSONS_MAP ? 1 : useSketchLessonVisual && isUnlocked ? 1.5 : 0,
            borderColor: isGoldTheme
                ? (isCurrent ? GOLD_RICH.hairlineStrong : isUnlocked ? goldHairline : GOLD_RICH.hairlineQuiet)
                :
                    USE_ELITE_LESSONS_MAP
                        ? rgbaHexCached(lessonAccent, isCurrent ? 0.70 : isUnlocked ? 0.36 : 0.16)
                        : useSketchLessonVisual && isUnlocked ? rgbaHexCached(lessonAccent, 0.44) : 'transparent',
        }}>
          {/* Card background */}
          {isUnlocked ? (<LinearGradient colors={isGoldTheme
                  ? (isCurrent ? goldCardGradient('selected') : lessonGoldLevel.card)
                  :
                      isCoralTheme
                          ? [darkenHexCached(bg, 0.62), darkenHexCached(bg, 0.43), darkenHexCached(bg, 0.30)]
                          : [darkenHexCached(bg, 0.52), darkBg, darkenHexCached(bg, 0.38)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={cardLayerStyle}/>) : levelLockedByExam ? (<LinearGradient colors={isGoldTheme
                  ? goldCardGradient('muted')
                  :
                      isCoralTheme
                          ? [darkenHexCached(bg, 0.34), darkenHexCached(bg, 0.28), darkenHexCached(bg, 0.23)]
                          : [darkenHexCached(bg, 0.36), darkenHexCached(bg, 0.31), darkenHexCached(bg, 0.26)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[cardLayerStyle, { opacity: isGoldTheme ? 0.68 : 1 }]}/>) : (<LinearGradient colors={isGoldTheme ? GOLD_GRADIENTS.mutedPanel : isCoralTheme ? ['#1A1113', '#24191C', '#130D0F'] : [darkenHexCached(bg, 0.30), darkenHexCached(bg, 0.25), darkenHexCached(bg, 0.20)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={cardLayerStyle}/>)}
          {isGoldTheme && (<LinearGradient colors={[
                  rgbaHexCached(lessonAccent, isUnlocked ? 0.22 : 0.08),
                  'rgba(0,0,0,0)',
                  rgbaHexCached(lessonAccent, isCurrent ? 0.20 : 0.10),
              ]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardLayerStyle}/>)}
          {isGoldTheme && <GoldBevel radius={cardRadius} intensity={isCurrent ? 'strong' : isUnlocked ? 'normal' : 'quiet'}/>}
          {/* Progress fill */}
          {showLessonProgressFill && (<LinearGradient colors={isGoldTheme
                  ? [goldAntique, goldBright, lessonAccent] as [string, string, string]
                  :
                      isCoralTheme
                          ? [darkenHexCached(bg, 0.84), bg]
                          : [bg, lightenHex(bg, 1.28)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: `${progPct}%`,
                  opacity: isGoldTheme ? (levelLockedByExam ? 0.16 : 0.22) : levelLockedByExam ? 0.28 : 1,
                  borderTopLeftRadius: cardRadius,
                  borderBottomLeftRadius: cardRadius,
                  borderTopRightRadius: cardRadius,
                  borderBottomRightRadius: cardRadius,
              }}/>)}
          {/* Subtle inner highlight on filled part top edge */}
          {showLessonProgressFill && (<View style={{
                  position: 'absolute', left: 0, top: 0,
                  width: `${progPct}%`, height: 1.5,
                  backgroundColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCoralTheme ? 'rgba(255,230,222,0.52)' : useSketchLessonVisual ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
                  opacity: levelLockedByExam ? 0.24 : 1,
                  borderTopLeftRadius: cardRadius,
                  borderTopRightRadius: cardRadius,
              }}/>)}
           <View style={{
                   position: 'absolute', left: 0, right: 0, top: 0,
                   height: 2,
                   backgroundColor: lessonAccent,
                   opacity: isUnlocked ? (isCurrent ? 0.78 : 0.45) : 0.22,
                   zIndex: 2,
                   ...LESSON_CARD_ACCENT_EDGE_SHADOW,
               }}/>
          {/* Content */}
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{
                  color: useDarkMetaText ? LESSON_CARD_OPEN_META_TEXT : lessonMetaColor,
                  fontSize: f.label,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  ...(useDarkMetaText ? {} : LESSON_CARD_ACCENT_TEXT_SHADOW),
              }} maxFontSizeMultiplier={1}>
                {triLang(lang, {
                    ru: `УРОК ${num}`,
                    uk: `УРОК ${num}`,
                    es: `LECCIÓN ${num}`,
                    'pt-BR': `LIÇÃO ${num}`,
                    vi: `BÀI ${num}`,
                    id: `PELAJARAN ${num}`,
                    tr: `DERS ${num}`,
                    pl: `LEKCJA ${num}`,
                })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {premiumRequired
                    ? <PlusBadge themeMode={_themeMode} label={triLang(lang, { ru: 'Plus', uk: 'Plus', es: 'Plus', 'pt-BR': 'Plus', vi: 'Plus', id: 'Plus', tr: 'Plus', pl: 'Plus' })}/>
                    : !isUnlocked
                    ? <Ionicons name="lock-closed" size={14} color={isGoldTheme ? rgbaHexCached(lessonAccent, 0.64) : isCoralTheme ? rgbaHexCached(lessonAccent, 0.60) : lockedCardHasLightFill ? darkenHexCached(bg, 0.40) : 'rgba(255,255,255,0.55)'} style={LESSON_CARD_ACCENT_TEXT_SHADOW}/>
                    : USE_ELITE_LESSONS_MAP && isComplete
                        ? <Ionicons name="checkmark-circle" size={18} color={isGoldTheme ? lessonAccent : isCoralTheme ? 'rgba(255,236,230,0.86)' : lessonAccent} style={LESSON_CARD_ACCENT_TEXT_SHADOW}/>
                        : progPct > 0
                            ? (<Text style={{
                                    color: isGoldTheme
                                        ? (isComplete ? goldBright : textMuted)
                                        :
                                            isCoralTheme
                                                ? (isComplete ? '#FFF8F4' : 'rgba(255,236,230,0.82)')
                                                : (isComplete ? lessonAccent : rgbaHexCached(lessonAccent, 0.82)),
                                     fontSize: f.label,
                                     fontWeight: '800',
                                     ...LESSON_CARD_ACCENT_TEXT_SHADOW,
                                 }} maxFontSizeMultiplier={1}>
                              {progPct}%
                            </Text>)
                            : null}
              </View>
            </View>
            {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — текст уже
                переносится на 2 строки (numberOfLines={2}), этого достаточно, guard-ok */}
            <Text style={{
                color: lessonTextColor,
                fontSize: f.body,
                fontWeight: '700',
                ...LESSON_CARD_WHITE_TEXT_SHADOW,
            }} numberOfLines={2} maxFontSizeMultiplier={1}>
              {name}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>);
});

// ── Главный компонент ─────────────────────────────────────────────────────────
type LessonsTabProps = { overlayIdentityEpoch?: number };

// ── Глава-аккордеон ──────────────────────────────────────────────────────────
const AnimatedChapterCircle = Reanimated.createAnimatedComponent(Circle);

/**
 * Кольцо прогресса главы. viewBox с запасом под stroke+linecap (r=19, stroke=5,
 * холст 48 — дуга и её круглые концы НЕ обрезаются по краям). Дуга рисуется
 * конечной анимацией ~1с при появлении, без циклов.
 */
function ChapterProgressRing({ pct, locked, accent, trackColor, textColor, lockColor, delayMs = 0 }: {
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
    const fill = useSharedValue(0);
    useEffect(() => {
        fill.value = 0;
        fill.value = withDelay(250 + delayMs, withTiming(clamped, { duration: 1000, easing: Easing.out(Easing.cubic) }));
        return () => cancelAnimation(fill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clamped, delayMs]);
    const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - fill.value) }));
    return (
      <View style={{ width: size, height: size, flexShrink: 0 }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <SvgLinearGradient id={`chapterRingGrad-${delayMs}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity={0.72} />
              <Stop offset="1" stopColor={accent} />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
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
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {locked
            ? <Ionicons name="lock-closed" size={13} color={lockColor} />
            : <Text style={{ color: textColor, fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{Math.round(clamped * 100)}%</Text>}
        </View>
      </View>
    );
}

/** Единое славянское правило множественного числа (ru/uk/pl): 1 — one, 2-4 — few, остальные — many. */
function pluralSlavic(n: number, one: string, few: string, many: string): string {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (last === 1 && abs !== 11) return one;
    if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return few;
    return many;
}

function chapterLessonsWord(count: number, lang: Lang): string {
    switch (lang) {
        case 'uk': return pluralSlavic(count, 'урок', 'уроки', 'уроків');
        case 'es': return count === 1 ? 'lección' : 'lecciones';
        case 'pt-BR': return count === 1 ? 'lição' : 'lições';
        case 'vi': return 'bài học';
        case 'id': return 'pelajaran';
        case 'tr': return 'ders';
        case 'pl': return pluralSlavic(count, 'lekcja', 'lekcje', 'lekcji');
        default: return pluralSlavic(count, 'урок', 'урока', 'уроков');
    }
}

/** «8 уроков · идёт урок 7» для текущей главы, иначе «10 уроков · уроки 9–18». */
function chapterStatusLine(from: number, to: number, currentLessonNum: number | null, lang: Lang): string {
    const count = to - from + 1;
    const countPart = `${count} ${chapterLessonsWord(count, lang)}`;
    if (currentLessonNum != null && currentLessonNum >= from && currentLessonNum <= to) {
        const current = triLang(lang, {
            ru: `идёт урок ${currentLessonNum}`,
            uk: `йде урок ${currentLessonNum}`,
            es: `lección ${currentLessonNum} en curso`,
            'pt-BR': `lição ${currentLessonNum} em andamento`,
            vi: `đang học bài ${currentLessonNum}`,
            id: `pelajaran ${currentLessonNum} berjalan`,
            tr: `${currentLessonNum}. ders sürüyor`,
            pl: `lekcja ${currentLessonNum} w toku`,
        });
        return `${countPart} · ${current}`;
    }
    const range = triLang(lang, {
        ru: `уроки ${from}–${to}`,
        uk: `уроки ${from}–${to}`,
        es: `lecciones ${from}–${to}`,
        'pt-BR': `lições ${from}–${to}`,
        vi: `bài ${from}–${to}`,
        id: `pelajaran ${from}–${to}`,
        tr: `dersler ${from}–${to}`,
        pl: `lekcje ${from}–${to}`,
    });
    return `${countPart} · ${range}`;
}

/**
 * Карточка главы-аккордеона: шапка (кольцо + название + статус + Plus-чип +
 * шеврон) и плавно раскрываемое тело с текущими плашками уроков и экзаменом.
 * Раскрытие — конечная Reanimated-анимация высоты по замеренному контенту.
 */
const ChapterCard = React.memo(function ChapterCard({ title, statusLine, pct, lockedPlus, expanded, onToggle, accent, isGoldTheme, t, f, themeMode, delayMs = 0, children }: {
    title: string;
    statusLine: string;
    pct: number;
    lockedPlus: boolean;
    expanded: boolean;
    onToggle: () => void;
    accent: string;
    isGoldTheme: boolean;
    t: ReturnType<typeof useTheme>['theme'];
    f: ReturnType<typeof useTheme>['f'];
    themeMode: ThemeMode;
    delayMs?: number;
    children: React.ReactNode;
}) {
    const progress = useSharedValue(expanded ? 1 : 0);
    const [contentH, setContentH] = useState(0);
    useEffect(() => {
        progress.value = withTiming(expanded ? 1 : 0, { duration: 320, easing: Easing.out(Easing.cubic) });
    }, [expanded, progress]);
    const bodyStyle = useAnimatedStyle(() => ({
        height: contentH === 0 ? (expanded ? undefined : 0) : progress.value * contentH,
        opacity: progress.value,
    }));
    const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 180}deg` }] }));
    const cardColors = isGoldTheme ? goldCardGradient('muted') : [t.bgSurface2, t.bgSurface, t.bgCard];
    return (
      <Reanimated.View entering={FadeInDown.delay(delayMs).duration(320)} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 0 }}>
        <LinearGradient colors={cardColors as any} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        {isGoldTheme ? <GoldBevel radius={20} intensity="quiet" /> : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}. ${statusLine}`}
          onPress={() => { hapticTap(); onToggle(); }}
          activeOpacity={0.82}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}
        >
          <ChapterProgressRing pct={pct} locked={lockedPlus} accent={accent} trackColor={t.bgSurface} textColor={t.textPrimary} lockColor={t.textMuted} delayMs={delayMs} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
              {title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label - 1, fontWeight: '700', marginTop: 2 }}>
              {statusLine}
            </Text>
          </View>
          {lockedPlus ? <PlusBadge themeMode={themeMode} size="xs" /> : null}
          <Reanimated.View style={[{ width: 26, height: 26, borderRadius: 9, backgroundColor: expanded ? `${accent}24` : t.bgSurface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, chevronStyle]}>
            <Ionicons name="chevron-down" size={13} color={expanded ? accent : t.textMuted} />
          </Reanimated.View>
        </TouchableOpacity>
        <Reanimated.View style={[{ overflow: 'hidden' }, bodyStyle]}>
          <View
            onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0 && Math.abs(h - contentH) > 1) setContentH(h); }}
            style={{ paddingBottom: 10 }}
          >
            {children}
          </View>
        </Reanimated.View>
      </Reanimated.View>
    );
});

export default function LessonsTab({ overlayIdentityEpoch: _overlayIdentityEpoch = 0 }: LessonsTabProps = {}) {
    void _overlayIdentityEpoch;
    const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    const topFadeScroll = useTopFadeScroll();
    const { goHome } = useTabNav();
    const { theme: t, f, themeMode } = useTheme();
    const isGoldTheme = themeMode === 'gold';
    const isCoralTheme = themeMode === 'coral';
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
    const boot = lessonsUiSessionCacheByTarget[lessonCacheTarget] ?? getLessonsTabInitialState(studyTarget);
    const [noLimits, setNoLimits] = useState(() => boot?.noLimits ?? false);
    const [legacyFreeLessonCap, setLegacyFreeLessonCap] = useState(
        () => boot?.legacyFreeLessonCap ?? FREE_LESSON_LIMIT,
    );
    const { hasPremiumAccess: isPremium } = usePremium();
    const dialogAccess = useFeatureAccess('ai_dialog');
    const [scores, setScores] = useState<number[]>(() => boot?.scores ?? new Array(32).fill(0));
    const [progCounts, setProgCounts] = useState<number[]>(() => boot?.progCounts ?? new Array(32).fill(0));
    const [passCounts, setPassCounts] = useState<number[]>(() => boot?.passCounts ?? new Array(32).fill(0));
    const [examBestPcts, setExamBestPcts] = useState<Record<string, number>>(() => boot?.examBestPcts ?? {});
    const examBestPctTargetRef = useRef(lessonCacheTarget);
    const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>(() => boot?.examPassCounts ?? {});
    // persistedUnlocked — это список уроков, ранее открытых через unlockLesson()
    // (после прохождения предыдущего на ★2.5+, покупки премиума, сдачи зачёта).
    // Используется как safety-net, чтобы юзер после restore из облака или просто
    // апдейта не терял уже открытые уроки, если у него best_score < 2.5
    // (медаль не сохранена) и lesson{N}_progress пропал (он не в SYNC_KEYS).
    const [persistedUnlocked, setPersistedUnlocked] = useState<number[]>(() => boot?.persistedUnlocked ?? []);
    const [examResults, setExamResults] = useState<Record<string, {
        pct: number;
        passed: boolean;
    }>>(() => boot?.examResults ?? {});
    const scrollRef = useRef<any>(null);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const { activeIdx, focusTick } = useTabNav();
    const lessonsTabVisible = activeIdx === 1;
    // Две страницы вкладки: список уроков и перенесённые ИИ-диалоги (если фича включена).
    const dialogsEnabled = isAiDialogEnabled();
    const [page, setPage] = useState<'lessons' | 'dialogs' | 'v2'>('lessons');
    const openLearningRoute = useCallback(() => {
        hapticTap();
        void readPersonalPlanState()
            .then((state) => {
                router.push((state ? '/personal_plan' : '/personal_plan_setup') as any);
            })
            .catch(() => {
                router.push('/personal_plan_setup' as any);
            });
    }, [router]);
    const [gateModal, setGateModal] = useState<null | {
        kind: 'exam';
        level: string;
    } | {
        kind: 'lesson';
        prevNum: number;
    } | {
        kind: 'levelGate';
        level: string;
        prevLevel: string;
    } | {
        kind: 'frenchExam';
        level: string;
    } | {
        kind: 'premium';
        lessonNum: number;
    }>(null);
    const mountedRef = useRef(true);
    const lessonsStorageHydratedRef = useRef(false);
    const scoresLoadRef = useRef<{
        target: string;
        promise: Promise<LessonsTabSnapshot>;
    } | null>(null);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    useEffect(() => {
        if (lessonsTabVisible && scrollRef.current) {
            scrollRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [lessonsTabVisible]);
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
                nextEntry.promise.then(() => {
                    if (scoresLoadRef.current === nextEntry) {
                        scoresLoadRef.current = null;
                    }
                }, () => {
                    if (scoresLoadRef.current === nextEntry) {
                        scoresLoadRef.current = null;
                    }
                });
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
            lessonsUiSessionCacheByTarget[lessonCacheTarget] = snapshot;
        }
        catch {
            /* ignore */
        }
    }, [lessonCacheTarget, studyTarget]);
    useEffect(() => {
        if (lessonsStorageHydratedRef.current) return;
        lessonsStorageHydratedRef.current = true;
        void loadScores();
    }, [loadScores]);
    /** Свайп/тап на вкладку «Уроки» — те же кейсы, где layout focus не збільшує focusTick */
    useEffect(() => {
        if (!lessonsTabVisible) return;
        void loadScores();
    }, [focusTick, lessonsTabVisible, loadScores]);
    const lessons = useMemo(() => lessonNamesForStudyTarget(lang, studyTarget), [lang, studyTarget]);
    const premiumReachableLevelIndex = useMemo(() => {
        let idx = getCourseLevelIndex('A1');
        if (examResults.A1?.passed)
            idx = Math.max(idx, getCourseLevelIndex('A2'));
        if (examResults.A2?.passed)
            idx = Math.max(idx, getCourseLevelIndex('B1'));
        if (examResults.B1?.passed || examResults.B2?.passed)
            idx = Math.max(idx, getCourseLevelIndex('B2'));
        for (let i = 0; i < 32; i++) {
            const lessonNum = i + 1;
            if ((scores[i] ?? 0) > 0 || (progCounts[i] ?? 0) > 0 || (passCounts[i] ?? 0) > 0) {
                idx = Math.max(idx, getCourseLevelIndex(getCourseLevelForLesson(lessonNum)));
            }
        }
        for (const lessonNum of persistedUnlocked) {
            idx = Math.max(idx, getCourseLevelIndex(getCourseLevelForLesson(lessonNum)));
        }
        return idx;
    }, [examResults, passCounts, persistedUnlocked, progCounts, scores]);
    const unlockedLessons = useMemo(() => {
        if (DEV_CONTENT_UNLOCK || noLimits)
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
            legacyFreeLessonCap,
        });
    }, [legacyFreeLessonCap, noLimits, isPremium, persistedUnlocked, premiumReachableLevelIndex, scores]);
    type ListItem = {
        kind: 'chapter';
        level: CourseLevel;
        from: number;
        to: number;
    } | {
        kind: 'attestation';
    };
    // Список сгруппирован в главы-аккордеоны (A1/A2/B1/B2 по COURSE_LEVEL_RANGES);
    // аттестация — вне глав, внизу списка, как раньше.
    const listData: ListItem[] = useMemo(() => {
        const chapters: ListItem[] = (Object.keys(COURSE_LEVEL_RANGES) as CourseLevel[]).map((level) => {
            const [from, to] = COURSE_LEVEL_RANGES[level];
            return { kind: 'chapter', level, from, to };
        });
        return [...chapters, { kind: 'attestation' }];
    }, []);
    const currentLessonNum = useMemo(() => {
        const idx = unlockedLessons.findIndex((unlocked, i) => unlocked && (progCounts[i] ?? 0) < 50);
        return idx >= 0 ? idx + 1 : null;
    }, [progCounts, unlockedLessons]);
    // Текущая глава раскрыта по умолчанию; остальные — по тапу, независимо друг от друга.
    const currentChapterLevel = currentLessonNum != null ? getCourseLevelForLesson(currentLessonNum) : null;
    const [openChapters, setOpenChapters] = useState<ReadonlySet<string>>(() => new Set<string>([currentChapterLevel ?? 'A1']));
    useEffect(() => {
        if (!currentChapterLevel) return;
        setOpenChapters((prev) => (prev.has(currentChapterLevel) ? prev : new Set([...prev, currentChapterLevel])));
    }, [currentChapterLevel]);
    const toggleChapter = useCallback((level: string) => {
        setOpenChapters((prev) => {
            const next = new Set(prev);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
        });
    }, []);
    // Стабильные per-chapter колбэки: без них React.memo(ChapterCard) ломался бы
    // новой лямбдой onToggle на каждом рендере.
    const chapterToggles = useMemo(() => {
        const map: Record<string, () => void> = {};
        for (const level of Object.keys(COURSE_LEVEL_RANGES) as CourseLevel[]) {
            map[level] = () => toggleChapter(level);
        }
        return map;
    }, [toggleChapter]);
    // Keep this dense list stable: JS-driven per-card scroll scale made cards jitter.
    const itemAnims = useMemo(() => listData.map(() => null), [listData]);
    const handleLessonsScroll = useCallback((e: any) => {
        topFadeScroll?.onScroll?.(e);
        onBouncyScroll(e);
    }, [onBouncyScroll, topFadeScroll]);
    // Страховка от «экран уехал вниз»: после отпускания пальца/инерции у верхнего
    // края возвращаем резинку в 0, чтобы над списком не оставалась пустая полоса.
    const handleLessonsScrollEnd = useCallback((e: any) => {
        const y = e?.nativeEvent?.contentOffset?.y ?? 0;
        if (y <= 0 && bouncyStretch.value !== 0) {
            bouncyStretch.value = withSpring(0, { damping: 22, stiffness: 240 });
        }
    }, [bouncyStretch]);
    // Премиум-урок: открываем пейвол СРАЗУ, без промежуточного окна «урок входит в премиум».
    // (Раньше тап показывал ThemedChoiceModal с кнопкой «Получить Premium» — лишний шаг.)
    const openLessonPaywall = useCallback((lessonNum: number) => {
        const doneSoFar = scores.filter(score => score > 0).length;
        openPremiumPaywall(router, {
            context: lessonPaywallContext(lessonNum, legacyFreeLessonCap),
            lessons_done: doneSoFar,
            ...lessonPurchaseContinuationParams(lessonNum),
        });
    }, [legacyFreeLessonCap, router, scores]);
    // ── Exam card: рендерится внутри своей главы, визуал без изменений ──
    const renderExamCard = (lvl: string): React.ReactNode => {
    const themeExamMeta = EXAM_META_BY_THEME[themeMode] ?? EXAM_META_SKETCH;
    const sketchMeta = themeExamMeta[lvl];
    const goldLevel = goldCefrAccent(lvl);
    const meta = isGoldTheme
        ? { bg: goldSurface, accent: goldLevel.accent }
        :
            sketchMeta;
    const [from, to] = lvl === 'A1' ? [1, 8] : lvl === 'A2' ? [9, 18] : lvl === 'B1' ? [19, 28] : [29, 32];
    const scoreReady = scores.slice(from - 1, to).every(s => s >= 4.5);
    const examLevel = lvl as CourseLevel;
    const examLevelIdx = getCourseLevelIndex(examLevel);
    const premiumExamAvailable = isPremium && examLevelIdx <= premiumReachableLevelIndex;
    const examPremiumRequired = !isPremium && !DEV_CONTENT_UNLOCK && !noLimits && requiresPremiumForLesson(to, legacyFreeLessonCap);
    const examSourceAvailable = examContentAvailableForTarget(studyTarget);
    const allDone = examSourceAvailable && !examPremiumRequired && (DEV_CONTENT_UNLOCK || noLimits || premiumExamAvailable || scoreReady);
    const prevExamLevel = getPreviousCourseLevel(examLevel);
    const result = examResults[lvl];
    const isB2 = lvl === 'B2';
    const currentTargetStateBestPct = examBestPctTargetRef.current === lessonCacheTarget
        ? (examBestPcts[lvl] ?? 0)
        : 0;
    const overlayBestPct = studyTarget === 'en' || studyTarget === 'fr'
        ? peekCurrentExamBestPct(studyTarget, examLevel)
        : 0;
    const examMedal = getExamMedalTier(Math.max(currentTargetStateBestPct, overlayBestPct));
    const examPass = examPassCounts[lvl] ?? 0;
    const examDots = getEarnedDots(examMedal, examPass);
    const label = triLang(lang, {
        ru: isB2 ? 'Экзамен' : `Экзамен ${lvl}`,
        uk: isB2 ? 'Екзамен' : `Залік ${lvl}`,
        es: isB2 ? 'Examen' : `Examen de ${lvl}`,
        'pt-BR': isB2 ? 'Exame' : `Exame ${lvl}`,
        vi: isB2 ? 'Bài kiểm tra' : `Bài kiểm tra ${lvl}`,
        id: isB2 ? 'Ujian' : `Ujian ${lvl}`,
        tr: isB2 ? 'Sınav' : `${lvl} sınavı`,
        pl: isB2 ? 'Egzamin' : `Egzamin ${lvl}`,
    });
    const subLine = result
        ? (result.passed
            ? triLang(lang, {
                ru: `✅ Сдан — ${result.pct}%`,
                uk: `✅ Здано — ${result.pct}%`,
                es: `✅ Superado — ${result.pct}%`,
                'pt-BR': `✅ Aprovado — ${result.pct}%`,
                vi: `✅ Đã vượt qua — ${result.pct}%`,
                id: `✅ Lulus — ${result.pct}%`,
                tr: `✅ Geçildi — ${result.pct}%`,
                pl: `✅ Zdane — ${result.pct}%`,
            })
            : `✗ ${result.pct}%`)
        : !examSourceAvailable
            ? frenchExamGateCopy('level', lang).title
        : allDone
            ? triLang(lang, {
                ru: 'Нажми чтобы начать',
                uk: 'Натисни щоб почати',
                es: 'Toca para empezar',
                'pt-BR': 'Toque para começar',
                vi: 'Nhấn để bắt đầu',
                id: 'Ketuk untuk mulai',
                tr: 'Başlamak için dokun',
                pl: 'Dotknij, aby rozpocząć',
            })
            : examPremiumRequired
                ? triLang(lang, {
                    ru: 'Откроется с Plus',
                    uk: 'Відкриється з Plus',
                    es: 'Se abre con Plus',
                    'pt-BR': 'Abre com Plus',
                    vi: 'Mở với Plus',
                    id: 'Terbuka dengan Plus',
                    tr: 'Plus ile açılır',
                    pl: 'Otwiera się z Plus',
                })
                : isPremium && prevExamLevel
                    ? triLang(lang, {
                        ru: `Сначала зачёт ${prevExamLevel}`,
                        uk: `Спочатку залік ${prevExamLevel}`,
                        es: `Primero el examen ${prevExamLevel}`,
                        'pt-BR': `Primeiro o exame ${prevExamLevel}`,
                        vi: `Trước tiên là bài kiểm tra ${prevExamLevel}`,
                        id: `Ujian ${prevExamLevel} dulu`,
                        tr: `Önce ${prevExamLevel} sınavı`,
                        pl: `Najpierw egzamin ${prevExamLevel}`,
                    })
                    : triLang(lang, {
                        ru: `Завершите все уроки ${lvl} на 4.5+`,
                        uk: `Завершіть усі уроки ${lvl} на 4.5+`,
                        es: `Completa todas las lecciones de ${lvl} con nota mínima de 4,5`,
                        'pt-BR': `Conclua todas as lições ${lvl} com 4,5+`,
                        vi: `Hoàn thành tất cả bài học ${lvl} với 4.5+`,
                        id: `Selesaikan semua pelajaran ${lvl} dengan 4,5+`,
                        tr: `${lvl} seviyesindeki tüm dersleri 4.5+ ile tamamla`,
                        pl: `Ukończ wszystkie lekcje ${lvl} na 4,5+`,
                    });
    return (<Animated.View key={`e-${lvl}`} style={{ marginTop: 8, transform: [{ scale: 1 }], ...(isGoldTheme ? goldShadow(allDone ? 2 : 1) : {}), ...({}) }}>
    <TouchableOpacity activeOpacity={0.82} onPress={() => {
            hapticTap();
            const firstLessonByLevel = lvl === 'A1' ? 1 : lvl === 'A2' ? 9 : lvl === 'B1' ? 19 : 29;
            if (examPremiumRequired) {
                openLessonPaywall(requiresPremiumForLesson(firstLessonByLevel, legacyFreeLessonCap) ? firstLessonByLevel : to);
            }
            else if (!examSourceAvailable) {
                setGateModal({ kind: 'frenchExam', level: lvl });
            }
            else if (allDone) {
                router.push({ pathname: '/level_exam', params: { level: lvl } });
            }
            else if (isPremium && prevExamLevel) {
                setGateModal({ kind: 'levelGate', level: lvl, prevLevel: prevExamLevel });
            }
            else {
                setGateModal({ kind: 'exam', level: lvl });
            }
        }} style={{
            minHeight: 78,
            marginHorizontal: isGoldTheme ? 14 : 0,
            borderRadius: isGoldTheme ? 14 : 0,
            borderWidth: isGoldTheme ? 1 : 0,
            borderColor: isGoldTheme
                ? (allDone ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                :
                    'transparent',
            flexDirection: 'row',
            backgroundColor: meta.bg,
            opacity: allDone ? 1 : isPremium ? 0.38 : 0.5,
            overflow: 'hidden',
        }}>
      {isGoldTheme && (<LinearGradient colors={allDone ? goldLevel.card : goldCardGradient('muted')} locations={GOLD_SURFACE_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}/>)}
      {false}
      {false}
      {isGoldTheme && <GoldBevel radius={14} intensity={allDone ? 'strong' : 'quiet'}/>}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 4 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isGoldTheme ? 1 : 1.5, backgroundColor: isGoldTheme ? GOLD_RICH.hairlineStrong : meta.accent + '30' }}/>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isGoldTheme ? 1 : 1.5, backgroundColor: isGoldTheme ? GOLD_RICH.hairlineDark : meta.accent + '30' }}/>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {result?.passed
            ? <Ionicons name="checkmark-circle" size={isB2 ? 26 : 22} color={meta.accent}/>
            : allDone || isPremium
                ? <LessonExamThemeIcon themeMode={themeMode} size={isB2 ? 34 : 30} label={label}/>
                : <Ionicons name="lock-closed-outline" size={isB2 ? 26 : 22} color={meta.accent}/>}
          <View style={{ flex: 1 }}>
            <Text style={{ color: meta.accent, fontSize: isB2 ? f.h2 : f.bodyLg, fontWeight: '800' }} maxFontSizeMultiplier={1}>
              {label}
            </Text>
            <Text style={{ color: meta.accent + 'AA', fontSize: f.sub, marginTop: 1 }} maxFontSizeMultiplier={1}>
              {subLine}
            </Text>
          </View>
          {examDots.length > 0 && <MedalDots dots={examDots}/>}
          {allDone && <Ionicons name="chevron-forward" size={16} color={meta.accent + '80'}/>}
        </View>
      </View>
    </TouchableOpacity>
  </Animated.View>);
    };

    // ── Lesson book: плашка урока как есть (рендер внутри карточки главы) ──
    const renderLessonCard = ({ index, name }: { index: number; name: string }): React.ReactNode => {
const num = index + 1;
const isUnlocked = unlockedLessons[index];
const bg = bookPalette(num, themeMode);
const darkBg = darkenHexCached(bg, 0.42);
const progPct = Math.min(100, Math.round((progCounts[index] ?? 0) / 50 * 100));
const isComplete = progPct >= 100;
const isCurrent = currentLessonNum === num;
const lessonLevel = getCourseLevelForLesson(num);
const lessonGoldLevel = goldCefrAccent(lessonLevel);
const lessonAccent = bg;
const prevLessonLevel = getPreviousCourseLevel(lessonLevel);
const levelLockedByExam = isPremium && !isUnlocked && !DEV_CONTENT_UNLOCK && !noLimits;
const premiumRequired = !isPremium && !noLimits && requiresPremiumForLesson(num, legacyFreeLessonCap);
const showLessonProgressFill = isUnlocked && progPct > 0;
const cardRadius = isGoldTheme ? 14 : 16;
const lockedCardBaseColor = isGoldTheme
    ? goldSurface
    : isCoralTheme
        ? darkenHexCached(bg, 0.23)
        : darkenHexCached(bg, 0.28);
const cardLayerStyle = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: cardRadius,
    overflow: 'hidden' as const,
};
const lessonTextColor = isGoldTheme
    ? (isUnlocked ? t.textPrimary : 'rgba(247,241,228,0.44)')
    :
        !isUnlocked
            ? isCoralTheme
                ? 'rgba(255,248,244,0.44)'
                : levelLockedByExam
                ? 'rgba(255,255,255,0.42)'
                : 'rgba(255,255,255,0.35)'
            : isCoralTheme
                ? '#FFF8F4'
                : 'rgba(255,255,255,0.97)';
const lessonMetaColor = isGoldTheme
    ? (isUnlocked ? t.textMuted : 'rgba(184,173,146,0.36)')
    :
        !isUnlocked
            ? isCoralTheme
                ? 'rgba(255,214,204,0.34)'
                : levelLockedByExam
                ? 'rgba(255,255,255,0.30)'
                : 'rgba(255,255,255,0.30)'
            : isCoralTheme
                ? 'rgba(255,214,204,0.72)'
                : LESSON_CARD_OPEN_META_TEXT;
return (<LessonCard key={`l-${num}`}
    num={num} name={name} isUnlocked={isUnlocked} bg={bg} darkBg={darkBg}
    progPct={progPct} isComplete={isComplete} isCurrent={isCurrent}
    lessonLevel={lessonLevel} lessonGoldLevel={lessonGoldLevel}
    lessonAccent={lessonAccent} prevLessonLevel={prevLessonLevel}
    levelLockedByExam={levelLockedByExam} premiumRequired={premiumRequired}
    showLessonProgressFill={showLessonProgressFill}
    cardRadius={cardRadius} lockedCardBaseColor={lockedCardBaseColor}
    cardLayerStyle={cardLayerStyle}
    lessonTextColor={lessonTextColor} lessonMetaColor={lessonMetaColor}
    isGoldTheme={isGoldTheme} isCoralTheme={isCoralTheme} themeMode={themeMode}
    goldSurface={goldSurface} goldHairline={goldHairline}
    goldAntique={goldAntique} goldBright={goldBright}
    scaleAnim={null} lang={lang} f={f}
    openLessonPaywall={openLessonPaywall} setGateModal={setGateModal}
    router={router} studyTarget={studyTarget}
    isPremium={isPremium} DEV_CONTENT_UNLOCK={DEV_CONTENT_UNLOCK} noLimits={noLimits}
    legacyFreeLessonCap={legacyFreeLessonCap}
    textPrimary={t.textPrimary} textMuted={t.textMuted}
/>);
    };

    // ── Тела глав (плашки уроков + зачёт) мемоизированы ─────────────────────
    // Тап по шапке главы меняет только openChapters; без мемоизации каждый тап
    // перерендеривал все ~32 тяжёлые карточки уроков (градиенты/тени/SVG) —
    // отсюда подтормаживание раскрытия. Одинаковые ссылки на элементы дают
    // React bail-out, и раскрытие анимируется без JS-шторма.
    const chapterBodies = useMemo(() => {
        const bodies: Record<string, React.ReactNode> = {};
        for (const level of Object.keys(COURSE_LEVEL_RANGES) as CourseLevel[]) {
            const [from, to] = COURSE_LEVEL_RANGES[level];
            bodies[level] = (<>
                {lessons.slice(from - 1, to).map((name, offset) => renderLessonCard({ index: from - 1 + offset, name }))}
                {level !== 'B2' ? renderExamCard(level) : null}
            </>);
        }
        return bodies;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessons, unlockedLessons, progCounts, currentLessonNum, scores, examResults,
        examBestPcts, examPassCounts, premiumReachableLevelIndex, isPremium, noLimits,
        legacyFreeLessonCap, themeMode, isGoldTheme, isCoralTheme, t, f, lang,
        openLessonPaywall, router, studyTarget, goldSurface, goldHairline, goldAntique, goldBright]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (<>
    <ScreenGradient>
      {/* Фиксированная шапка (вне скролла): назад + заголовок + энергия.
          Верхний safe-area отступ даёт TabScaffold в (tabs)/_layout.tsx — здесь не дублируем. */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <TapScale
            onPress={() => goHome()}
            withHaptic={true}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
          </TapScale>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight: '700' }} numberOfLines={1}>
              {triLang(lang, { ru: 'Обучение', uk: 'Навчання', es: 'Aprender', 'pt-BR': 'Aprender', vi: 'Học', id: 'Belajar', tr: 'Öğren', pl: 'Nauka' })}
            </Text>
          </View>
          <View style={{ flexShrink: 0 }}>
            <EnergyBar size={30}/>
          </View>
        </View>

        {/* Переключатель страниц: Уроки | Маршрут | Диалоги */}
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: t.border, marginBottom: 2 }}>
            <TabUnderlineButton
              label={s.tabs.lessons}
              active={page === 'lessons'}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              themeMode={themeMode}
              onPress={() => { if (page !== 'lessons') { hapticTap(); setPage('lessons'); } }}
            />
            <TabUnderlineButton
              label={triLang(lang, { ru: 'Маршрут', uk: 'Маршрут', es: 'Ruta', 'pt-BR': 'Rota', vi: 'Lộ trình', id: 'Rute', tr: 'Rota', pl: 'Trasa' })}
              active={false}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              themeMode={themeMode}
              plusBadge={!isPremium}
              plusBadgeLabel={triLang(lang, { ru: 'Plus', uk: 'Plus', es: 'Plus', 'pt-BR': 'Plus', vi: 'Plus', id: 'Plus', tr: 'Plus', pl: 'Plus' })}
              onPress={openLearningRoute}
            />
            {dialogsEnabled ? (
            <TabUnderlineButton
              label={triLang(lang, { ru: 'Диалоги', uk: 'Діалоги', es: 'Diálogos', 'pt-BR': 'Diálogos', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyaloglar', pl: 'Dialogi' })}
              active={page === 'dialogs'}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              themeMode={themeMode}
              plusBadge={!dialogAccess}
              plusBadgeLabel={triLang(lang, { ru: 'Plus', uk: 'Plus', es: 'Plus', 'pt-BR': 'Plus', vi: 'Plus', id: 'Plus', tr: 'Plus', pl: 'Plus' })}
              onPress={() => { if (page !== 'dialogs') { hapticTap(); setPage('dialogs'); } }}
            />
            ) : null}
            {ENABLE_DEV_TOOLS ? (
            <TabUnderlineButton
              label="V2"
              active={page === 'v2'}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              themeMode={themeMode}
              onPress={() => { if (page !== 'v2') { hapticTap(); setPage('v2'); } }}
            />
            ) : null}
          </View>
      </View>

      {/* Страница «Диалоги» */}
      {dialogsEnabled && page === 'dialogs' ? (
        <View style={{ flex: 1 }}>
          <DialogsTabContent
            bottomPadding={tabContentBottomPad}
            onScroll={(e) => { topFadeScroll?.onScroll?.(e); }}
          />
        </View>
      ) : null}

      {ENABLE_DEV_TOOLS && page === 'v2' ? (
        <View style={{ flex: 1 }}>
          <LearningV2ModesLab bottomPadding={tabContentBottomPad} />
        </View>
      ) : null}

      {/* Страница «Уроки» (держим смонтированной, прячем при показе диалогов) */}
        <View style={{ flex: 1, display: (dialogsEnabled && page === 'dialogs') || page === 'v2' ? 'none' : 'flex' }}>
      <BouncyWrap style={bouncyStyle}>
      <Animated.FlatList ref={scrollRef} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={handleLessonsScroll}
        onScrollEndDrag={handleLessonsScrollEnd}
        onMomentumScrollEnd={handleLessonsScrollEnd}
        contentContainerStyle={{ paddingBottom: tabContentBottomPad }}
        decelerationRate="normal"
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        data={listData}
        keyExtractor={(item) => item.kind === 'chapter' ? `chap-${item.level}` : 'attestation'}
        initialNumToRender={12}
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews={true}
        ListFooterComponent={<>
          <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff', opacity: 0.15, letterSpacing: 0.5 }}>
              {triLang(lang, { ru: '· · ·', uk: '· · ·', es: '· · ·', 'pt-BR': '· · ·', vi: '· · ·', id: '· · ·', tr: '· · ·', pl: '· · ·' })}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff', opacity: 0.2, marginTop: 8 }}>
              {triLang(lang, { ru: 'Продолжение скоро', uk: 'Продовження незабаром', es: 'Próximamente', 'pt-BR': 'Continuação em breve', vi: 'Sắp có tiếp', id: 'Segera hadir', tr: 'Devamı yakında', pl: 'Ciąg dalszy wkrótce' })}
            </Text>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ReportErrorButton screen="lessons_tab" dataId="lessons_list" dataText={triLang(lang, {
              ru: 'Список уроков',
              uk: 'Список уроків',
              es: 'Lista de lecciones',
              'pt-BR': 'Lista de lições',
              vi: 'Danh sách bài học',
              id: 'Daftar pelajaran',
              tr: 'Ders listesi',
              pl: 'Lista lekcji',
            })}/>
          </View>
        </>}
        renderItem={({ item, index: i }) => {
            const scaleAnim = itemAnims[i];
            if (item.kind === 'attestation') {
                const attestationAccent = isGoldTheme
                    ? goldBright
                    : t.accent;
                const attestationColors = isGoldTheme
                    ? goldCardGradient('selected')
                    : [t.bgSurface2, t.bgSurface, t.bgCard];
                const attestationBorder = isGoldTheme
                    ? GOLD_RICH.hairlineStrong
                    : t.borderHighlight;
                const attestationText = isGoldTheme ? t.textPrimary : t.textOnCard;
                const attestationMuted = isGoldTheme ? t.textMuted : t.textMuted;
                return (<Animated.View key="attestation-after-32" style={{
                    marginTop: 12,
                    marginHorizontal: 14,
                    borderRadius: 18,
                    transform: [{ scale: scaleAnim ?? 1 }],
                    shadowColor: isGoldTheme ? '#000' : t.cardShadow,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isGoldTheme ? 0 : 0.16,
                    shadowRadius: 14,
                    elevation: 5,
                    ...(isGoldTheme ? goldShadow(2) : {}),
                    ...({}),
                }}>
                <TouchableOpacity activeOpacity={0.82} onPress={() => {
                        hapticTap();
                        router.push('/diagnostic_test');
                    }} style={{
                        minHeight: 126,
                        borderRadius: 18,
                        borderWidth: 0,
                        borderColor: attestationBorder,
                        overflow: 'hidden',
                        backgroundColor: isGoldTheme ? goldSurface : t.bgCard,
                    }}>
                  <LinearGradient colors={attestationColors as any} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}/>
                  <Image source={menuImages.test} style={{ position: 'absolute', right: -16, top: 7, width: 128, height: 128, opacity: isGoldTheme ? 0.16 : 0.08 }} contentFit="contain"/>
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: attestationAccent, opacity: 0.88 }}/>
                  <View style={{ position: 'absolute', left: 6, right: 0, top: 0, height: 1, backgroundColor: attestationAccent, opacity: 0.24 }}/>
                  {isGoldTheme && <GoldBevel radius={18} intensity="normal"/>}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 14, gap: 14 }}>
                    <View style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isGoldTheme ? 'rgba(255,235,180,0.10)' : t.accentBg,
                        borderWidth: 1,
                        borderColor: attestationBorder,
                    }}>
                      <Image source={menuImages.test} style={{ width: 58, height: 58, opacity: 0.96 }} contentFit="contain"/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <Text style={{ color: attestationMuted, fontSize: Math.max(12, f.label), fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' }} numberOfLines={1}>
                        B2 / CEFR
                      </Text>
                      {/* зачем: динамическое сжатие шрифта убрано (запрещённый паттерн) — статично
                          уменьшен базовый размер (было 27, стало 22), чтобы влезали длинные варианты
                          перевода («Değerlendirme», «Evaluación») без ужимания на рендере, guard-ok */}
                      <Text style={{ color: attestationText, fontSize: Math.max(22, Math.min(f.h1, 27)), lineHeight: Math.max(27, Math.min(f.h1, 27) + 4), fontWeight: '900', letterSpacing: 0 }} numberOfLines={1}>
                        {s.home.attestTile}
                      </Text>
                    </View>
                    <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(255,235,180,0.12)' : t.accentBg, borderWidth: 0, borderColor: attestationBorder }}>
                      <Ionicons name="chevron-forward" size={26} color={attestationAccent}/>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>);
            }
            // ── Глава-аккордеон ──────────────────────────────────────────────
            const { level: chapterLevel, from: chapFrom, to: chapTo } = item;
            const chapterAccent = isGoldTheme ? goldCefrAccent(chapterLevel).accent : t.accent;
            const chapterPremiumLocked = !isPremium && !DEV_CONTENT_UNLOCK && !noLimits && chapterLevel !== 'A1';
            const chapterCounts = progCounts.slice(chapFrom - 1, chapTo);
            const chapterDone = chapterCounts.filter((count) => (count ?? 0) >= 50).length;
            const chapterPct = chapterCounts.length > 0 ? chapterDone / chapterCounts.length : 0;
            const chapterIndex = (Object.keys(COURSE_LEVEL_RANGES) as CourseLevel[]).indexOf(chapterLevel);
            return (<View key={`chap-${chapterLevel}`} style={{ marginTop: chapterIndex === 0 ? 6 : 10, marginHorizontal: 14 }}>
              <ChapterCard
                title={triLang(lang, {
                    ru: `Глава ${chapterLevel}`,
                    uk: `Глава ${chapterLevel}`,
                    es: `Capítulo ${chapterLevel}`,
                    'pt-BR': `Capítulo ${chapterLevel}`,
                    vi: `Chương ${chapterLevel}`,
                    id: `Bab ${chapterLevel}`,
                    tr: `Bölüm ${chapterLevel}`,
                    pl: `Rozdział ${chapterLevel}`,
                })}
                statusLine={chapterStatusLine(chapFrom, chapTo, currentLessonNum, lang)}
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
        }}
      />
      </BouncyWrap>
      </View>

    </ScreenGradient>
    <ThemedChoiceModal visible={gateModal !== null} title={gateModal?.kind === 'frenchExam'
            ? frenchExamGateCopy('level', lang).title
            : gateModal?.kind === 'exam'
            ? triLang(lang, { ru: 'Недоступно', uk: 'Недоступно', es: 'No disponible', 'pt-BR': 'Indisponível', vi: 'Không khả dụng', id: 'Tidak tersedia', tr: 'Kullanılamaz', pl: 'Niedostępne' })
            : gateModal?.kind === 'premium'
                ? triLang(lang, {
                    ru: 'Plus',
                    uk: 'Plus',
                    es: 'Plus',
                    'pt-BR': 'Plus',
                    vi: 'Plus',
                    id: 'Plus',
                    tr: 'Plus',
                    pl: 'Plus',
                })
                : gateModal?.kind === 'levelGate'
                    ? triLang(lang, {
                        ru: 'Уровень пока закрыт',
                        uk: 'Рівень поки закритий',
                        es: 'Nivel bloqueado',
                        'pt-BR': 'Nível bloqueado',
                        vi: 'Cấp độ đang khóa',
                        id: 'Level masih terkunci',
                        tr: 'Seviye şimdilik kilitli',
                        pl: 'Poziom jest zablokowany',
                    })
                    : gateModal?.kind === 'lesson'
                        ? triLang(lang, {
                            ru: 'Урок заблокирован',
                            uk: 'Урок заблоковано',
                            es: 'Lección bloqueada',
                            'pt-BR': 'Lição bloqueada',
                            vi: 'Bài học bị khóa',
                            id: 'Pelajaran terkunci',
                            tr: 'Ders kilitli',
                            pl: 'Lekcja zablokowana',
                        })
                        : ''} message={gateModal?.kind === 'frenchExam'
            ? frenchExamGateCopy('level', lang).body
            : gateModal?.kind === 'exam'
            ? triLang(lang, {
                ru: `Сначала пройдите все уроки ${gateModal.level} с оценкой 4.5+`,
                uk: `Спочатку пройдіть всі уроки ${gateModal.level} з оцінкою 4.5+`,
                es: `Primero completa todas las lecciones de ${gateModal.level} con nota mínima de 4,5`,
                'pt-BR': `Primeiro conclua todas as lições ${gateModal.level} com nota 4,5+`,
                vi: `Trước tiên hãy hoàn thành tất cả bài học ${gateModal.level} với điểm 4.5+`,
                id: `Selesaikan dulu semua pelajaran ${gateModal.level} dengan nilai 4,5+`,
                tr: `Önce tüm ${gateModal.level} derslerini 4.5+ puanla tamamla`,
                pl: `Najpierw ukończ wszystkie lekcje ${gateModal.level} z wynikiem 4,5+`,
            })
            : gateModal?.kind === 'levelGate'
                ? triLang(lang, {
                    ru: `Чтобы открыть уровень ${gateModal.level}, сначала сдай зачёт ${gateModal.prevLevel}.`,
                    uk: `Щоб відкрити рівень ${gateModal.level}, спочатку складіть залік ${gateModal.prevLevel}.`,
                    es: `Para abrir el nivel ${gateModal.level}, primero supera el examen de ${gateModal.prevLevel}.`,
                    'pt-BR': `Para abrir o nível ${gateModal.level}, primeiro passe no exame ${gateModal.prevLevel}.`,
                    vi: `Để mở cấp độ ${gateModal.level}, trước tiên hãy vượt qua bài kiểm tra ${gateModal.prevLevel}.`,
                    id: `Untuk membuka level ${gateModal.level}, lulus dulu ujian ${gateModal.prevLevel}.`,
                    tr: `${gateModal.level} seviyesini açmak için önce ${gateModal.prevLevel} sınavını geç.`,
                    pl: `Aby odblokować poziom ${gateModal.level}, najpierw zdaj egzamin ${gateModal.prevLevel}.`,
                })
                : gateModal?.kind === 'lesson'
                    ? triLang(lang, {
                        ru: `Пройдите урок ${gateModal.prevNum} с оценкой 2.5+`,
                        uk: `Пройдіть урок ${gateModal.prevNum} з оцінкою 2.5+`,
                        es: `Completa la lección ${gateModal.prevNum} con nota mínima de 2,5`,
                        'pt-BR': `Conclua a lição ${gateModal.prevNum} com nota 2,5+`,
                        vi: `Hoàn thành bài học ${gateModal.prevNum} với điểm 2.5+`,
                        id: `Selesaikan pelajaran ${gateModal.prevNum} dengan nilai 2,5+`,
                        tr: `${gateModal.prevNum}. dersi 2.5+ puanla tamamla`,
                        pl: `Ukończ lekcję ${gateModal.prevNum} z wynikiem 2,5+`,
                    })
                    : gateModal?.kind === 'premium'
                        ? triLang(lang, {
                            ru: 'Этот урок входит в Plus.',
                            uk: 'Цей урок входить до Plus.',
                            es: 'Esta lección forma parte de Plus.',
                            'pt-BR': 'Esta lição faz parte do Plus.',
                            vi: 'Bài học này thuộc Plus.',
                            id: 'Pelajaran ini termasuk Plus.',
                            tr: 'Bu ders Plus kapsamındadır.',
                            pl: 'Ta lekcja jest częścią Plus.',
                        })
                        : ''} choices={gateModal?.kind === 'premium'
            ? [
                {
                    label: triLang(lang, { ru: 'Получить Plus', uk: 'Отримати Plus', es: 'Obtener Plus', 'pt-BR': 'Obter Plus', vi: 'Nhận Plus', id: 'Dapatkan Plus', tr: 'Plus al', pl: 'Zdobądź Plus' }),
                    variant: 'primary' as const,
                    onPress: () => {
                        // ThemedChoiceModal больше не зовёт onRequestClose за нас —
                        // закрытие гейта здесь же, одним действием.
                        setGateModal(null);
                        const doneSoFar = scores.filter(score => score > 0).length;
                        openPremiumPaywall(router, {
                            context: lessonPaywallContext(gateModal.lessonNum, legacyFreeLessonCap),
                            lessons_done: doneSoFar,
                            ...lessonPurchaseContinuationParams(gateModal.lessonNum),
                        });
                    },
                },
                {
                    label: triLang(lang, { ru: 'Пока нет', uk: 'Поки ні', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdilik hayır', pl: 'Jeszcze nie' }),
                    variant: 'secondary' as const,
                    onPress: () => { setGateModal(null); },
                },
            ]
            : [{ label: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }), onPress: () => { setGateModal(null); } }]} onRequestClose={() => setGateModal(null)}/>
    </>);
}

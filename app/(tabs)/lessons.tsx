import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import TapScale from '../../components/TapScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { buildSequentialFreeLessonUnlocks, lessonPaywallContext, requiresPremiumForLesson, resolveLessonAccess } from '../monetization_policy';
import { useTabNav } from '../TabContext';
import { Ionicons } from '@expo/vector-icons';
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
import { DEV_CONTENT_UNLOCK } from '../config';
import { hapticTap } from '../../hooks/use-haptics';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { getExamMedalTier, getEarnedDots } from '../medal_utils';
import { prefetchLessonMenuCache } from '../lesson_menu';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedChoiceModal from '../../components/ThemedChoiceModal';
import EnergyBar from '../../components/EnergyBar';
import DialogsTabContent from '../../components/DialogsTabContent';
import { isAiDialogEnabled, getFreeDialogsLifetime } from '../ai_dialog_flags';
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
function PremiumBadge({ label }: {
    label: string;
}) {
    return (<View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            overflow: 'hidden',
            borderWidth: 0.5,
            borderColor: GOLD_RICH.hairlineStrong,
        }}>
      <LinearGradient colors={GOLD_GRADIENTS.primaryButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}/>
      <Ionicons name="diamond" size={9} color={GOLD_RICH.bronzeDark}/>
      <Text style={{ color: GOLD_RICH.bronzeDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 }} maxFontSizeMultiplier={1}>
        {label}
      </Text>
    </View>);
}
// Высоты элементов (должны точно совпадать с реальным рендером)
const BOOK_H = 72; // высота книги

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
}

/**
 * Вкладка-надпись переключателя «Уроки | Диалоги»: у активной вкладки снизу —
 * золотая полоска-дуга с выгибом вниз («улыбка»), без отдельной плашки.
 * Цвет акцента приходит от темы (золото / accent). Неактивная — чистый текст.
 */
function TabUnderlineButton({ label, active, color, mutedColor, accent, fontSize, onPress, badge, badgeColor, badgeTextColor, badgeLabel }: TabUnderlineButtonProps) {
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
            style={{ paddingTop: 10, paddingBottom: 12, alignItems: 'center', position: 'relative' }}
        >
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
    isPremium, DEV_CONTENT_UNLOCK, noLimits,
    textPrimary: _tp, textMuted,
}: LessonCardProps) {
    const lockedCardHasLightFill = false;
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
              }}/>
          {/* Content */}
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{
                  color: lessonMetaColor,
                  fontSize: f.label,
                  fontWeight: '700',
                  letterSpacing: 0.8,
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
                    ? <PremiumBadge label={triLang(lang, { ru: 'Premium', uk: 'Premium', es: 'Premium', 'pt-BR': 'Premium', vi: 'Premium', id: 'Premium', tr: 'Premium', pl: 'Premium' })}/>
                    : !isUnlocked
                    ? <Ionicons name="lock-closed" size={14} color={isGoldTheme ? rgbaHexCached(lessonAccent, 0.64) : isCoralTheme ? rgbaHexCached(lessonAccent, 0.60) : lockedCardHasLightFill ? darkenHexCached(bg, 0.40) : 'rgba(255,255,255,0.55)'}/>
                    : USE_ELITE_LESSONS_MAP && isComplete
                        ? <Ionicons name="checkmark-circle" size={18} color={isGoldTheme ? lessonAccent : isCoralTheme ? 'rgba(255,236,230,0.86)' : lessonAccent}/>
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
                                }} maxFontSizeMultiplier={1}>
                              {progPct}%
                            </Text>)
                            : null}
              </View>
            </View>
            <Text style={{
                color: lessonTextColor,
                fontSize: f.body,
                fontWeight: '700',
            }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1}>
              {name}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>);
});

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LessonsTab() {
    const tabContentBottomPad = useTabContentBottomPad();
    const router = useRouter();
    const insets = useSafeAreaInsets();
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
    const { hasPremiumAccess: isPremium } = usePremium();
    const [scores, setScores] = useState<number[]>(() => boot?.scores ?? new Array(32).fill(0));
    const [progCounts, setProgCounts] = useState<number[]>(() => boot?.progCounts ?? new Array(32).fill(0));
    const [passCounts, setPassCounts] = useState<number[]>(() => boot?.passCounts ?? new Array(32).fill(0));
    const [examBestPcts, setExamBestPcts] = useState<Record<string, number>>(() => boot?.examBestPcts ?? {});
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
    // Две страницы вкладки: список уроков и перенесённые ИИ-диалоги (если фича включена).
    const dialogsEnabled = isAiDialogEnabled();
    const freeDialogsLifetime = getFreeDialogsLifetime();
    const [page, setPage] = useState<'lessons' | 'dialogs'>('lessons');
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
    const scoresLoadRef = useRef<{
        target: string;
        promise: Promise<LessonsTabSnapshot>;
    } | null>(null);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    useEffect(() => {
        if (activeIdx === 1 && scrollRef.current) {
            scrollRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [activeIdx]);
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
            setNoLimits(snapshot.noLimits);
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
        void loadScores();
    }, [focusTick, loadScores]);
    /** Свайп/тап на вкладку «Уроки» — те же кейсы, где layout focus не збільшує focusTick */
    useEffect(() => {
        if (activeIdx === 1)
            void loadScores();
    }, [activeIdx, loadScores]);
    const lessons = lessonNamesForStudyTarget(lang, studyTarget);
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
        });
    }, [noLimits, isPremium, persistedUnlocked, premiumReachableLevelIndex, scores]);
    type ListItem = {
        kind: 'header';
        label: string;
        color: string;
    } | {
        kind: 'lesson';
        index: number;
        name: string;
    } | {
        kind: 'exam';
        level: string;
    } | {
        kind: 'attestation';
    };
    const listData: ListItem[] = useMemo(() => {
        const data: ListItem[] = [];
        const HEADERS: [
            number,
            string,
            string
        ][] = [
            [1, 'A1', bookPalette(1, themeMode)],
            [9, 'A2', bookPalette(9, themeMode)],
            [19, 'B1', bookPalette(19, themeMode)],
            [29, 'B2', bookPalette(29, themeMode)],
        ];
        lessons.forEach((name, idx) => {
            const num = idx + 1;
            const hdr = HEADERS.find(([n]) => n === num);
            if (hdr)
                data.push({ kind: 'header', label: hdr[1], color: hdr[2] });
            data.push({ kind: 'lesson', index: idx, name });
            if (num === 8 || num === 18 || num === 28) {
                const lvl = num <= 8 ? 'A1' : num <= 18 ? 'A2' : num <= 28 ? 'B1' : 'B2';
                data.push({ kind: 'exam', level: lvl });
            }
            if (num === 32) {
                data.push({ kind: 'attestation' });
            }
        });
        return data;
    }, [lessons, themeMode]);
    const currentLessonNum = useMemo(() => {
        const idx = unlockedLessons.findIndex((unlocked, i) => unlocked && (progCounts[i] ?? 0) < 50);
        return idx >= 0 ? idx + 1 : null;
    }, [progCounts, unlockedLessons]);
    // Keep this dense list stable: JS-driven per-card scroll scale made cards jitter.
    const itemAnims = useMemo(() => listData.map(() => null), [listData]);
    const handleLessonsScroll = useCallback((e: any) => {
        topFadeScroll?.onScroll?.(e);
        onBouncyScroll(e);
    }, [onBouncyScroll, topFadeScroll]);
    // Премиум-урок: открываем пейвол СРАЗУ, без промежуточного окна «урок входит в премиум».
    // (Раньше тап показывал ThemedChoiceModal с кнопкой «Получить Premium» — лишний шаг.)
    const openLessonPaywall = useCallback((lessonNum: number) => {
        const doneSoFar = scores.filter(score => score > 0).length;
        router.push({
            pathname: '/premium_modal',
            params: {
                context: lessonPaywallContext(lessonNum),
                lessons_done: String(doneSoFar),
            },
        } as any);
    }, [router, scores]);
    // ── Render ────────────────────────────────────────────────────────────────
    return (<>
    <ScreenGradient>
      {/* Фиксированная шапка (вне скролла): назад + заголовок + энергия */}
      <View style={{ paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <TapScale
            onPress={() => goHome()}
            withHaptic={true}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
          </TapScale>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight: '700' }} numberOfLines={1}>
              {dialogsEnabled
                ? triLang(lang, { ru: 'Обучение', uk: 'Навчання', es: 'Aprender', 'pt-BR': 'Aprender', vi: 'Học', id: 'Belajar', tr: 'Öğren', pl: 'Nauka' })
                : s.tabs.lessons}
            </Text>
          </View>
          <View style={{ flexShrink: 0 }}>
            <EnergyBar size={30}/>
          </View>
        </View>

        {/* Переключатель страниц: Уроки | Диалоги (подчёркивание) */}
        {dialogsEnabled ? (
          <View style={{ flexDirection: 'row', gap: 22, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: t.border, marginBottom: 2 }}>
            <TabUnderlineButton
              label={s.tabs.lessons}
              active={page === 'lessons'}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              onPress={() => { if (page !== 'lessons') { hapticTap(); setPage('lessons'); } }}
            />
            <TabUnderlineButton
              label={triLang(lang, { ru: 'Диалоги', uk: 'Діалоги', es: 'Diálogos', 'pt-BR': 'Diálogos', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyaloglar', pl: 'Dialogi' })}
              active={page === 'dialogs'}
              color={t.textPrimary}
              mutedColor={t.textMuted}
              accent={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              fontSize={f.body}
              badge={!isPremium}
              badgeColor={isGoldTheme ? GOLD_RICH.champagne : t.accent}
              badgeTextColor={isGoldTheme ? (t.textOnGold ?? '#2A2410') : t.correctText}
              badgeLabel={`${freeDialogsLifetime} free`}
              onPress={() => { if (page !== 'dialogs') { hapticTap(); setPage('dialogs'); } }}
            />
          </View>
        ) : null}
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

      {/* Страница «Уроки» (держим смонтированной, прячем при показе диалогов) */}
      <View style={{ flex: 1, display: dialogsEnabled && page === 'dialogs' ? 'none' : 'flex' }}>
      <BouncyWrap style={bouncyStyle}>
      <Animated.FlatList ref={scrollRef} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={handleLessonsScroll}
        contentContainerStyle={{ paddingBottom: tabContentBottomPad }}
        decelerationRate="normal"
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        data={listData}
        keyExtractor={(item, index) => item.kind === 'lesson' ? `l-${(item as any).index + 1}` : item.kind === 'header' ? `h-${(item as any).label}-${index}` : item.kind === 'exam' ? `e-${(item as any).level}` : 'attestation'}
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
            // ── CEFR divider ─────────────────────────────────────────────
            if (item.kind === 'header') {
                const isPremiumLevel = !isPremium && !DEV_CONTENT_UNLOCK && !noLimits && item.label !== 'A1';
                const goldLevel = goldCefrAccent(item.label);
                const headerAccent = isGoldTheme ? goldLevel.accent : item.color;
                const headerWash = isGoldTheme
                    ? goldLevel.wash
                    :
                        item.color + '33';
                const headerLineColor = isGoldTheme
                    ? GOLD_RICH.hairlineQuiet
                    :
                        item.color + '30';
                if (USE_ELITE_LESSONS_MAP) {
                    return (<View key={`h-${item.label}`} style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 7 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: headerWash, borderWidth: isGoldTheme ? 1 : 1.5, borderColor: headerAccent }}>
                      <Text style={{ color: headerAccent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8 }}>
                        {item.label}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: screenTitleColor, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                        {triLang(lang, {
                            ru: `Глава ${item.label}`,
                            uk: `Глава ${item.label}`,
                            es: `Capítulo ${item.label}`,
                            'pt-BR': `Capítulo ${item.label}`,
                            vi: `Chương ${item.label}`,
                            id: `Bab ${item.label}`,
                            tr: `Bölüm ${item.label}`,
                            pl: `Rozdział ${item.label}`,
                        })}
                      </Text>
                    </View>
                    {isPremiumLevel && <Ionicons name="lock-closed" size={14} color={headerAccent} style={{ opacity: 0.75 }}/>}
                  </View>
                </View>);
                }
                return (<View key={`h-${item.label}`} style={{ paddingLeft: 22, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: headerAccent }}/>
                <Text style={{ color: headerAccent, fontSize: f.label, fontWeight: '800', letterSpacing: 1.4 }}>
                  {item.label}
                </Text>
                {isPremiumLevel && (<Ionicons name="lock-closed" size={12} color={headerAccent} style={{ opacity: 0.7 }}/>)}
                <View style={{ flex: 1, height: 0.5, backgroundColor: headerLineColor }}/>
              </View>);
            }
            // ── Exam card ────────────────────────────────────────────────
            if (item.kind === 'exam') {
                const { level: lvl } = item;
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
                const examPremiumRequired = !isPremium && !DEV_CONTENT_UNLOCK && !noLimits && requiresPremiumForLesson(to);
                const examSourceAvailable = examContentAvailableForTarget(studyTarget);
                const allDone = examSourceAvailable && !examPremiumRequired && (DEV_CONTENT_UNLOCK || noLimits || premiumExamAvailable || scoreReady);
                const prevExamLevel = getPreviousCourseLevel(examLevel);
                const result = examResults[lvl];
                const isB2 = lvl === 'B2';
                const examMedal = getExamMedalTier(examBestPcts[lvl] ?? 0);
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
                                ru: 'Откроется с Premium',
                                uk: 'Відкриється з Premium',
                                es: 'Se abre con Premium',
                                'pt-BR': 'Abre com Premium',
                                vi: 'Mở với Premium',
                                id: 'Terbuka dengan Premium',
                                tr: 'Premium ile açılır',
                                pl: 'Otwiera się z Premium',
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
                return (<Animated.View key={`e-${lvl}`} style={{ marginTop: 8, transform: [{ scale: scaleAnim ?? 1 }], ...(isGoldTheme ? goldShadow(allDone ? 2 : 1) : {}), ...({}) }}>
                <TouchableOpacity activeOpacity={0.82} onPress={() => {
                        hapticTap();
                        const firstLessonByLevel = lvl === 'A1' ? 1 : lvl === 'A2' ? 9 : lvl === 'B1' ? 19 : 29;
                        if (examPremiumRequired) {
                            openLessonPaywall(requiresPremiumForLesson(firstLessonByLevel) ? firstLessonByLevel : to);
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
            }
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
                        borderWidth: 1,
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
                      <Text style={{ color: attestationText, fontSize: Math.max(27, f.h1), lineHeight: Math.max(32, f.h1 + 4), fontWeight: '900', letterSpacing: 0 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {s.home.attestTile}
                      </Text>
                    </View>
                    <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? 'rgba(255,235,180,0.12)' : t.accentBg, borderWidth: 1, borderColor: attestationBorder }}>
                      <Ionicons name="chevron-forward" size={26} color={attestationAccent}/>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>);
            }
            // ── Lesson book ──────────────────────────────────────────────
            const { index, name } = item;
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
            const premiumRequired = !isPremium && !noLimits && requiresPremiumForLesson(num);
            const showLessonProgressFill = isUnlocked && progPct > 0;
            const cardRadius = isGoldTheme ? 14 : USE_ELITE_LESSONS_MAP ? 18 : 16;
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
                            : rgbaHexCached(lessonAccent, 0.82);
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
                scaleAnim={scaleAnim} lang={lang} f={f}
                openLessonPaywall={openLessonPaywall} setGateModal={setGateModal}
                router={router} studyTarget={studyTarget}
                isPremium={isPremium} DEV_CONTENT_UNLOCK={DEV_CONTENT_UNLOCK} noLimits={noLimits}
                textPrimary={t.textPrimary} textMuted={t.textMuted}
            />);
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
                    ru: 'Premium',
                    uk: 'Premium',
                    es: 'Premium',
                    'pt-BR': 'Premium',
                    vi: 'Premium',
                    id: 'Premium',
                    tr: 'Premium',
                    pl: 'Premium',
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
                            ru: 'Этот урок входит в Premium.',
                            uk: 'Цей урок входить до Premium.',
                            es: 'Esta lección forma parte de Premium.',
                            'pt-BR': 'Esta lição faz parte do Premium.',
                            vi: 'Bài học này thuộc Premium.',
                            id: 'Pelajaran ini termasuk Premium.',
                            tr: 'Bu ders Premium kapsamındadır.',
                            pl: 'Ta lekcja jest częścią Premium.',
                        })
                        : ''} choices={gateModal?.kind === 'premium'
            ? [
                {
                    label: triLang(lang, { ru: 'Получить Premium', uk: 'Отримати Premium', es: 'Obtener Premium', 'pt-BR': 'Obter Premium', vi: 'Nhận Premium', id: 'Dapatkan Premium', tr: 'Premium al', pl: 'Zdobądź Premium' }),
                    variant: 'primary' as const,
                    onPress: () => {
                        const doneSoFar = scores.filter(score => score > 0).length;
                        router.push({
                            pathname: '/premium_modal',
                            params: {
                                context: lessonPaywallContext(gateModal.lessonNum),
                                lessons_done: String(doneSoFar),
                            },
                        } as any);
                    },
                },
                {
                    label: triLang(lang, { ru: 'Пока нет', uk: 'Поки ні', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdilik hayır', pl: 'Jeszcze nie' }),
                    variant: 'secondary' as const,
                    onPress: () => { },
                },
            ]
            : [{ label: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }), onPress: () => { } }]} onRequestClose={() => setGateModal(null)}/>
    </>);
}

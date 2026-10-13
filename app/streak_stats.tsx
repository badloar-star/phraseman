import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { KIT_MOTION } from '../constants/motionHybrid';
import Reanimated, { FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withTiming, withDelay, cancelAnimation, Easing } from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { View, Text, ScrollView, Pressable, TouchableOpacity, Share, StyleSheet, } from 'react-native';
import { LinearGradient } from '../components/SafeLinearGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useAccentGraphics } from '../hooks/use_accent_graphics';
import ContentWrap from '../components/ContentWrap';
import { glassFill } from '../components/GlassSurface';
import StatsArtBackdrop from '../components/StatsArtBackdrop';
import StatsCardArtSurface from '../components/StatsCardArtSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { streakCalendarShortWeekdays, streakChartScrubHint, streakWeekRowShort, streakProtectionStatusLabel, } from '../constants/streak_stats_i18n';
// stationary_clubs feature удалён.
import { ENABLE_DEV_TOOLS, STORE_URL } from './config';
import { shouldDevUnlockStatsPremiumContent } from './stats_premium_access';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import StatsPremiumBlur from '../components/StatsPremiumBlur';
import ActivityHeatmap365 from '../components/ActivityHeatmap365';
import { StreakChainIcon } from '../components/StreakChainIcon';
import { StreakRuleExplainer } from '../components/streak/StreakRuleExplainer';
import StreakStagesModal from '../components/streak/StreakStagesModal';
import { hapticTap } from '../hooks/use-haptics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { commitPremiumFreeFreeze } from './economy/premium_free_freeze';
import { DebugLogger } from './debug-logger';
import { getStatsCache, hydrateStatsCacheFromStorage, refreshStatsCache, type StatsCachedDay, type StatsCachedTimeDay, type StatsPreloadData, } from './statsCache';
import { actionToastTri, emitAppEvent } from './events';
import { getLocalDayKey } from './local_date';
import { syncDailyAnalyticsIfNeeded, loadPercentileData } from './daily_analytics_sync';
import { loadLifetimeProfileStats, type LifetimeProfileStats } from './lifetime_profile_stats';
import { devRandomizeLifetimePathDailyMetrics, loadLifetimeTotalsChartDays, loadWeeklyLearnedCounts, type LifetimeTotalsChartKind, type LifetimeChartDay, type DevLifetimePathRandomSums, } from './stats_daily_breakdown';
import { ALL_ACHIEVEMENTS, achievementNameForLang, loadAchievementStates } from './achievements';
import SkeletonBlock from '../components/SkeletonShimmer';
import { LOAD_GATE_TOTAL_MS } from './load_gate_config';
import AchievementArt from '../components/AchievementArt';
import { ACHIEVEMENT_ICON } from '../constants/achievementIcons';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { type ThemeMode } from '../constants/theme';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../constants/streakIconAssets';
import GoldBevel from '../components/GoldBevel';
import { FlowText } from '../components/text-integrity/FlowText';
import { AdaptiveLabel } from '../components/text-integrity/AdaptiveLabel';
import { buildStatsLearningInsights, formatCompactDuration, type StatsLearningInsights } from './stats_learning_insights';
import { StatScoreRing } from '../components/stats/StatScoreRing';
import { StatBars, type StatBar } from '../components/stats/StatBars';
import { StatProgressRow } from '../components/stats/StatProgressRow';
import { StatCountUpText } from '../components/stats/StatCountUpText';
import { nestedBoxShadow, plateBoxShadow } from '../components/v2/ShadowSurface';
import { DEFAULT_STATS_PRIMARY_METRIC, normalizeStatsPrimaryMetric, recentUnlockedAchievementIds, type StatsPrimaryMetric } from './stats_primary_metric';
import { statsPrimaryMetricKey } from './target_storage_keys';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { navigateAfterModalClose } from './safe_modal_navigation';
import { shouldUsePracticeWarmup } from './streak_stats_practice_balance';
import { safeRouterBack } from './navigation_back';
import { visiblePercentile } from './stats_percentile_display';
import { resolveTesterNoPremiumOverride } from './tester_premium_override';
import { noAndroidOutline } from '../constants/androidGlow';
import { glassTone } from '../components/dialogs/glass/glassTone'; // зачем (координатор 12.10): шеврон «Архив» — тон текста темы, виден и на светлой (был белый 45 %)

const EXEMPT_COLOR_1 = '#35D07F'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
const EXEMPT_COLOR_2 = '#35D07F'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
const EXEMPT_COLOR_3 = 'rgba(255,255,255,0.08)'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { accentGraphicOf } from '../constants/themeAccentRoles';
const CHART_H = 110;
const DAYS_SHOW = 14;
// зачем (results.html «Серия и статистика»): акцент карточек — тон стекла активной темы (t.accent = токен cta),
// а не легаси-хром по themeMode; подложки — плоские тона, без свечения и цветных кромок.
function accentTint(color: string, strength: 'quiet' | 'normal' | 'strong' = 'normal'): string {
    return /^#[0-9a-f]{6}$/i.test(color) ? color + (strength === 'strong' ? '2E' : strength === 'quiet' ? '14' : '22') : color;
}
function debugStatsRoute(stage: string, extra?: unknown) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[streak_stats_debug]', stage, extra ?? '');
    }
}
/** Градиент карточек статистики — берём из темы вместо хардкода зелёного */
function statsCardGradient(t: {
    bgCard: string;
    bgPrimary: string;
    cardGradient?: [
        string,
        string
    ];
}): [
    string,
    string,
    string
] {
    if (t.bgPrimary === GOLD_RICH.blackVoid)
        return GOLD_GRADIENTS.premiumPanel;
    const cg = (t as any).cardGradient as [
        string,
        string
    ] | undefined;
    if (cg)
        return [cg[0], cg[0], cg[1]];
    return [t.bgCard, t.bgCard, t.bgPrimary];
}
function statsSurfaceRadius(themeMode: ThemeMode, fallback: number): number {
    return fallback;
}
function pluralRu(n: number, one: string, few: string, many: string): string {
    const mod10 = Math.abs(n) % 10;
    const mod100 = Math.abs(n) % 100;
    if (mod10 === 1 && mod100 !== 11)
        return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return few;
    return many;
}
/** Линейный график «Весь путь»: сетка; линия по сырым значениям; опционально вторая — сглаженная (rollingAvg3). */
const LIFETIME_LINE_COL_W = 26;
const LIFETIME_LINE_GAP = 3;
const LIFETIME_LINE_CELL = LIFETIME_LINE_COL_W + LIFETIME_LINE_GAP;
const LIFETIME_LINE_PLOT_H = 108;
type LifetimeChartTheme = {
    bgSurface: string;
    border: string;
    textPrimary: string;
    textSecond: string;
    textMuted: string;
    accentText: string; // зачем (светлый акцент): сюда приходит accentText, а не сырой accent
};
interface DayData {
    date: string;
    shortLabel: string;
    dayNum: string;
    active: boolean;
    streak: number;
}
/** Время в приложении по тем же календарным датам, foreground мс. */
interface TimeDayData {
    date: string;
    shortLabel: string;
    dayNum: string;
    ms: number;
    active: boolean;
}
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const getLast14 = (): string[] => {
    const days: string[] = [];
    for (let i = DAYS_SHOW - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(toDateStr(d));
    }
    return days;
};
function labelCachedDayRows(rows: StatsCachedDay[], wdays: readonly string[]): DayData[] {
    return rows.map((row) => {
        const d = new Date(`${row.date}T12:00:00`);
        return {
            ...row,
            shortLabel: wdays[d.getDay()] ?? row.dayNum,
            dayNum: row.dayNum || String(d.getDate()),
        };
    });
}
function labelCachedTimeDayRows(rows: StatsCachedTimeDay[], wdays: readonly string[]): TimeDayData[] {
    return rows.map((row) => {
        const d = new Date(`${row.date}T12:00:00`);
        return {
            ...row,
            shortLabel: wdays[d.getDay()] ?? row.dayNum,
            dayNum: row.dayNum || String(d.getDate()),
        };
    });
}
const CHART_VALUE_LABEL_H = 20;
/** Время за день над столбцом «Время в приложении» (foreground, мс). */
function formatTimeBarMs(ms: number, lang: Lang): string {
    const safe = Math.max(0, Math.floor(ms));
    const totalM = Math.floor(safe / 60000);
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    if (safe > 0 && totalM < 1) {
        return triLang(lang, {
            ru: '<1м',
            uk: '<1хв',
            es: '<1m',
            en: "<1m",
            'pt-BR': "<1min",
            vi: "<1 phút",
            id: "<1 mnt",
            tr: "<1 dk",
            pl: "<1 min",
        });
    }
    if (totalM <= 0)
        return triLang(lang, {
            ru: '0',
            uk: '0',
            es: '0',
            en: "0",
            'pt-BR': "0",
            vi: "0",
            id: "0",
            tr: "0",
            pl: "0",
        });
    if (h === 0)
        return triLang(lang, {
            ru: `${m}м`,
            uk: `${m}хв`,
            es: `${m}m`,
            en: `${m}m`,
            'pt-BR': `${m}min`,
            vi: `${m} phút`,
            id: `${m} mnt`,
            tr: `${m} dk`,
            pl: `${m} min`,
        });
    if (m === 0)
        return triLang(lang, {
            ru: `${h}ч`,
            uk: `${h}г`,
            es: `${h}h`,
            en: `${h}h`,
            'pt-BR': `${h}h`,
            vi: `${h} giờ`,
            id: `${h} jam`,
            tr: `${h} sa`,
            pl: `${h} godz.`,
        });
    return triLang(lang, {
        ru: `${h}ч${m}`,
        uk: `${h}г${m}`,
        es: `${h}h${m}`,
        en: `${h}h${m}`,
        'pt-BR': `${h}h${m}`,
        vi: `${h} giờ ${m} phút`,
        id: `${h} jam ${m} mnt`,
        tr: `${h} sa ${m} dk`,
        pl: `${h} godz. ${m} min`,
    });
}
type LearningRhythmDay = Pick<DayData, 'date' | 'shortLabel' | 'dayNum' | 'active' | 'streak'> & {
    minutes: number;
    combined: number;
    isToday: boolean;
};
type LearningCoachMetrics = {
    score: number;
    scoreLabel: string;
    scoreSubLabel: string;
    status: string;
    scoreHint: string;
    isWarmup: boolean;
    active7: number;
    minutes7: number;
    avgMinutesActive: number;
    totalStreak: number;
    todayMinutes: number;
    bestDayLabel: string;
    weakDayLabel: string;
    rhythmSummary: string;
    actionTitle: string;
    actionBody: string;
    actionCta: string;
    scoreColor: string;
    rhythmDays: LearningRhythmDay[];
    /** Пн…Вс текущей локальной недели (results-007, макет); будущие дни — isFuture, без минут. */
    calendarWeekDays: (LearningRhythmDay & { isFuture: boolean })[];
    /** Подпись строки «Стабильный ритм ›» по состоянию (results-007). */
    rhythmCaption: string;
};
function clampNumber(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}
function minutesFromMs(ms: number): number {
    return Math.max(0, Math.round((Number(ms) || 0) / 60000));
}
function humanMinutes(minutes: number, lang: Lang): string {
    const safe = Math.max(0, Math.round(minutes));
    if (safe === 0)
        return triLang(lang, {
            ru: '0 мин',
            uk: '0 хв',
            es: '0 min',
            en: "0 min",
            'pt-BR': "0 min",
            vi: "0 phút",
            id: "0 mnt",
            tr: "0 dk",
            pl: "0 min",
        });
    if (safe < 60)
        return triLang(lang, {
            ru: `${safe} мин`,
            uk: `${safe} хв`,
            es: `${safe} min`,
            en: `${safe} min`,
            'pt-BR': `${safe} min`,
            vi: `${safe} phút`,
            id: `${safe} mnt`,
            tr: `${safe} dk`,
            pl: `${safe} min`,
        });
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    if (m === 0)
        return triLang(lang, {
            ru: `${h} ч`,
            uk: `${h} год`,
            es: `${h} h`,
            en: `${h}h`,
            'pt-BR': `${h} h`,
            vi: `${h} giờ`,
            id: `${h} jam`,
            tr: `${h} sa`,
            pl: `${h} godz.`,
        });
    return triLang(lang, {
        ru: `${h} ч ${String(m).padStart(2, '0')} мин`,
        uk: `${h} год ${m} хв`,
        es: `${h} h ${m} min`,
        en: `${h}h ${String(m).padStart(2, '0')}min`,
        'pt-BR': `${h} h ${m} min`,
        vi: `${h} giờ ${m} phút`,
        id: `${h} jam ${m} mnt`,
        tr: `${h} sa ${m} dk`,
        pl: `${h} godz. ${m} min`,
    });
}
/** [STREAK-WEEK]: сколько из последних 7 дней имеют время и сумма минут — чтобы видеть «пустую неделю» в первом кадре. */
function streakWeekSummary(rows: readonly { date: string; ms: number }[]): { weekDaysWithTime: number; weekMinutes: number } {
    const last7 = new Set<string>();
    const cursor = new Date();
    for (let i = 0; i < 7; i++) { last7.add(getLocalDayKey(cursor)); cursor.setDate(cursor.getDate() - 1); }
    const week = rows.filter((row) => last7.has(row.date));
    return { weekDaysWithTime: week.filter((row) => row.ms > 0).length, weekMinutes: Math.round(week.reduce((sum, row) => sum + row.ms, 0) / 60000) };
}
function buildLearningCoachMetrics(dayRows: DayData[], timeRows: TimeDayData[], totalStreak: number, lang: Lang): LearningCoachMetrics {
    // зачем (жалоба «серия висит», 04.10): «сегодня» и даты недели — по ЛОКАЛЬНОМУ дню устройства, как у счётчика серии и у строк statsCache
    // (modules/stats_activity_rows.ts); UTC-день расходился с ними вечером/ночью в поясах UTC+N.
    const todayStr = getLocalDayKey();
    const timeByDate = new Map(timeRows.map((d) => [d.date, d]));
    const sourceDays = dayRows.length > 0 ? dayRows : getLast14().map((date) => {
        const d = new Date(`${date}T12:00:00`);
        return {
            date,
            shortLabel: streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY)[d.getDay()],
            dayNum: String(d.getDate()),
            active: false,
            streak: 0,
        };
    });
    // Всегда полные 7 календарных дней, заканчивая сегодняшним: у свежего аккаунта
    // история короче недели, и 2 столбика растягивались на всю ширину с дырами.
    const dayByDate = new Map(sourceDays.map((d) => [d.date, d]));
    const weekWdays = streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY);
    const weekDates: string[] = [];
    {
        const cursor = new Date(`${todayStr}T12:00:00`);
        cursor.setDate(cursor.getDate() - 6);
        for (let i = 0; i < 7; i++) {
            weekDates.push(getLocalDayKey(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    const rhythmDays: LearningRhythmDay[] = weekDates.map((date) => {
        const known = dayByDate.get(date);
        const cal = new Date(`${date}T12:00:00`);
        const studyMs = timeByDate.get(date)?.ms ?? 0;
        const minutes = minutesFromMs(studyMs);
        // зачем: отметка дня — из строк статистики (время ≥ 60 с ИЛИ день подразумевается счётчиком серии), а не только из времени.
        const active = known?.active === true || studyMs >= 60000;
        return {
            date,
            shortLabel: known?.shortLabel ?? weekWdays[cal.getDay()],
            dayNum: known?.dayNum ?? String(cal.getDate()),
            streak: known?.streak ?? 0,
            active,
            minutes,
            combined: minutes,
            isToday: date === todayStr,
        };
    });
    const active7 = rhythmDays.filter((d) => d.active).length;
    const minutes7 = rhythmDays.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutesActive = active7 > 0 ? Math.round(minutes7 / active7) : 0;
    const todayRow = rhythmDays.find((d) => d.isToday) ?? rhythmDays[rhythmDays.length - 1];
    const todayMinutes = todayRow?.minutes ?? 0;
    const ranked = [...rhythmDays].sort((a, b) => b.combined - a.combined);
    const bestDay = ranked[0];
    const weakDay = [...rhythmDays].sort((a, b) => a.combined - b.combined)[0];
    const regularityPart = clampNumber(active7 / 5, 0, 1) * 45;
    // От недельного объёма (цель ~60 мин/нед), а не от среднего за активный день:
    // раньше один длинный день давал полный балл «длины занятий» и оценка льстила.
    const focusPart = clampNumber(minutes7 / 60, 0, 1) * 35;
    const streakPart = clampNumber(totalStreak / 14, 0, 1) * 20;
    const score = Math.round(regularityPart + focusPart + streakPart);
    const isWarmup = shouldUsePracticeWarmup({ active7, totalStreak, minutes7 });
    let scoreLabel = String(score);
    let scoreSubLabel = '/100';
    let scoreColor = score >= 76 ? '#35D07F' : score >= 50 ? '#FFB020' : '#FF6B6B'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
    let status = score >= 76
        ? triLang(lang, {
            ru: 'Стабильный ритм',
            uk: 'Стабільний ритм',
            es: 'Ritmo estable',
            en: "Steady rhythm",
            'pt-BR': "Ritmo estável",
            vi: "Nhịp ổn định",
            id: "Ritme stabil",
            tr: "İstikrarlı ritim",
            pl: "Stabilny rytm",
        })
        : score >= 50
            ? triLang(lang, {
                ru: 'Занимайся чаще — ритм окрепнет',
                uk: 'Займайся частіше — ритм зміцніє',
                es: 'Hace falta más ritmo',
                en: "Practice more — rhythm will strengthen",
                'pt-BR': "Precisa de mais ritmo",
                vi: "Cần đều hơn",
                id: "Perlu ritme lebih baik",
                tr: "Daha fazla ritim gerek",
                pl: "Potrzeba więcej rytmu",
            })
            : triLang(lang, {
                ru: 'Ритм просел',
                uk: 'Ритм просів',
                es: 'El ritmo bajó',
                en: "Rhythm dropped",
                'pt-BR': "O ritmo caiu",
                vi: "Nhịp đã giảm",
                id: "Ritme menurun",
                tr: "Ritim düştü",
                pl: "Rytm spadł",
            });
    let scoreHint = triLang(lang, {
        ru: 'Показывает, насколько ровно идет практика за последние 7 дней. Лучше всего помогают короткие занятия без больших пауз.',
        uk: 'Показує, наскільки рівно йде практика за останні 7 днів. Найкраще допомагають короткі заняття без великих пауз.',
        es: 'Muestra qué tan estable fue la práctica en los últimos 7 días. Ayudan más las sesiones cortas sin pausas largas.',
        en: "Shows how steady your practice was over the last 7 days. Short sessions without long gaps help the most.",
        'pt-BR': "Mostra quão estável foi a prática nos últimos 7 dias. Sessões curtas sem pausas longas ajudam mais.",
        vi: "Cho thấy việc luyện tập ổn định thế nào trong 7 ngày qua. Các buổi ngắn không nghỉ quá lâu sẽ hữu ích hơn.",
        id: "Menunjukkan seberapa stabil latihan dalam 7 hari terakhir. Sesi pendek tanpa jeda panjang lebih membantu.",
        tr: "Son 7 günde pratiğin ne kadar istikrarlı olduğunu gösterir. Uzun ara vermeden yapılan kısa seanslar daha çok yardımcı olur.",
        pl: "Pokazuje, jak stabilne było ćwiczenie w ostatnich 7 dniach. Najbardziej pomagają krótkie sesje bez długich przerw.",
    });
    const firstActiveDay = rhythmDays.find((d) => d.active);
    // «слабый: -» с прочерком выглядел сломанным: вторую часть показываем только когда
    // данных достаточно и слабый день реально отличается от лучшего.
    const showWeakDay = active7 >= 3 && !!weakDay?.shortLabel && weakDay.shortLabel !== bestDay?.shortLabel;
    const weakPart = showWeakDay
        ? triLang(lang, {
            ru: ` · слабый: ${weakDay.shortLabel}`,
            uk: ` · слабкий: ${weakDay.shortLabel}`,
            es: ` · flojo: ${weakDay.shortLabel}`,
            en: ` · weakest: ${weakDay.shortLabel}`,
            'pt-BR': ` · fraco: ${weakDay.shortLabel}`,
            vi: ` · yếu: ${weakDay.shortLabel}`,
            id: ` · lemah: ${weakDay.shortLabel}`,
            tr: ` · zayıf: ${weakDay.shortLabel}`,
            pl: ` · słaby: ${weakDay.shortLabel}`,
        })
        : '';
    let rhythmSummary = triLang(lang, {
        ru: `Лучший день: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        uk: `Найкращий день: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        es: `Mejor día: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        en: `Best day: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        'pt-BR': `Melhor dia: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        vi: `Ngày tốt nhất: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        id: `Hari terbaik: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        tr: `En iyi gün: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
        pl: `Najlepszy dzień: ${bestDay?.shortLabel ?? '-'}${weakPart}`,
    });
    if (isWarmup) {
        scoreLabel = String(active7);
        scoreSubLabel = triLang(lang, {
            ru: 'дн.',
            uk: 'дн.',
            es: 'd.',
            en: "d.",
            'pt-BR': "d.",
            vi: "ngày",
            id: "h",
            tr: "g.",
            pl: "d.",
        });
        scoreColor = '#4F8FF7'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
        status = triLang(lang, {
            ru: 'Начало положено',
            uk: 'Гарний старт',
            es: 'Ya estás en marcha',
            en: "You're off to a start",
            'pt-BR': "Você já começou",
            vi: "Đã bắt đầu",
            id: "Sudah dimulai",
            tr: "Başlangıç yapıldı",
            pl: "Dobry początek",
        });
        scoreHint = triLang(lang, {
            ru: `Пока ${active7} ${pluralRu(active7, 'день', 'дня', 'дней')} практики, в среднем по ${humanMinutes(avgMinutesActive, lang)}. Позанимайся ещё — и картина станет полной.`,
            uk: `Поки ${active7} ${pluralRu(active7, 'день', 'дні', 'днів')} практики, у середньому по ${humanMinutes(avgMinutesActive, lang)}. Позаймайся ще — і картина стане повною.`,
            es: `Por ahora ${active7} ${active7 === 1 ? 'día' : 'días'} de práctica, ${humanMinutes(avgMinutesActive, lang)} de media. Sigue practicando y verás el panorama completo.`,
            en: `So far ${active7} ${active7 === 1 ? 'day' : 'days'} of practice, averaging ${humanMinutes(avgMinutesActive, lang)}. Keep practicing and the picture will fill in.`,
            'pt-BR': `Por enquanto ${active7} ${active7 === 1 ? 'dia' : 'dias'} de prática, ${humanMinutes(avgMinutesActive, lang)} em média. Continue praticando e o quadro ficará completo.`,
            vi: `Hiện có ${active7} ngày luyện tập, trung bình ${humanMinutes(avgMinutesActive, lang)}. Luyện thêm — bức tranh sẽ đầy đủ hơn.`,
            id: `Sejauh ini ${active7} hari latihan, rata-rata ${humanMinutes(avgMinutesActive, lang)}. Terus berlatih — gambarannya akan lengkap.`,
            tr: `Şimdilik ${active7} gün pratik, ortalama ${humanMinutes(avgMinutesActive, lang)}. Devam et — tablo netleşecek.`,
            pl: `Na razie ${active7} ${active7 === 1 ? 'dzień' : 'dni'} praktyki, średnio ${humanMinutes(avgMinutesActive, lang)}. Ćwicz dalej — obraz będzie pełny.`,
        });
        rhythmSummary = firstActiveDay
            ? triLang(lang, {
                ru: `Первый активный день: ${firstActiveDay.shortLabel}`,
                uk: `Перший активний день: ${firstActiveDay.shortLabel}`,
                es: `Primer día activo: ${firstActiveDay.shortLabel}`,
                en: `First active day: ${firstActiveDay.shortLabel}`,
                'pt-BR': `Primeiro dia ativo: ${firstActiveDay.shortLabel}`,
                vi: `Ngày hoạt động đầu tiên: ${firstActiveDay.shortLabel}`,
                id: `Hari aktif pertama: ${firstActiveDay.shortLabel}`,
                tr: `İlk aktif gün: ${firstActiveDay.shortLabel}`,
                pl: `Pierwszy aktywny dzień: ${firstActiveDay.shortLabel}`,
            })
            : triLang(lang, {
                ru: 'Неделя только начинается',
                uk: 'Тиждень тільки починається',
                es: 'La semana apenas empieza',
                en: "The week is just getting started",
                'pt-BR': "A semana está só começando",
                vi: "Tuần mới chỉ bắt đầu",
                id: "Minggu baru dimulai",
                tr: "Hafta yeni başlıyor",
                pl: "Tydzień dopiero się zaczyna",
            });
    }
    let actionTitle = triLang(lang, {
        ru: 'Сделай 5 минут сегодня',
        uk: 'Зроби 5 хвилин сьогодні',
        es: 'Haz 5 minutos hoy',
        en: "Do 5 minutes today",
        'pt-BR': "Faça 5 minutos hoje",
        vi: "Học 5 phút hôm nay",
        id: "Lakukan 5 menit hari ini",
        tr: "Bugün 5 dakika yap",
        pl: "Zrób dziś 5 minut",
    });
    let actionBody = triLang(lang, {
        ru: 'Лучший ход сейчас: короткое повторение, чтобы день засчитался и ритм не провалился.',
        uk: 'Найкращий хід зараз: коротке повторення, щоб день зарахувався і ритм не просів.',
        es: 'El mejor paso ahora: una repetición corta para contar el día y sostener el ritmo.',
        en: "Best move right now: a quick review to make the day count and keep the streak going.",
        'pt-BR': "O melhor passo agora: uma revisão curta para contar o dia e manter o ritmo.",
        vi: "Bước tốt nhất lúc này: ôn ngắn để tính ngày và giữ nhịp.",
        id: "Langkah terbaik sekarang: pengulangan singkat agar hari ini tetap tercatat dan ritme terjaga.",
        tr: "Şimdi en iyi adım: günü saydırmak ve ritmi korumak için kısa bir tekrar.",
        pl: "Najlepszy krok teraz: krótka powtórka, żeby zaliczyć dzień i utrzymać rytm.",
    });
    let actionCta = triLang(lang, {
        ru: 'Начать 5 минут',
        uk: 'Почати 5 хвилин',
        es: 'Empezar 5 min',
        en: "Start 5 min",
        'pt-BR': "Começar 5 min",
        vi: "Bắt đầu 5 phút",
        id: "Mulai 5 mnt",
        tr: "5 dk başlat",
        pl: "Zacznij 5 min",
    });
    if (isWarmup) {
        const warmupHasToday = todayMinutes > 0;
        actionTitle = triLang(lang, {
            ru: 'Отличный старт',
            uk: 'Чудовий старт',
            es: 'Buen comienzo',
            en: "Great start",
            'pt-BR': "Ótimo começo",
            vi: "Khởi đầu tốt",
            id: "Awal yang bagus",
            tr: "Harika başlangıç",
            pl: "Dobry start",
        });
        actionBody = warmupHasToday
            ? triLang(lang, {
                ru: 'Сегодня уже есть практика. Дальше достаточно коротких подходов без давления.',
                uk: 'Сьогодні вже є практика. Далі достатньо коротких підходів без тиску.',
                es: 'Hoy ya hubo práctica. Después bastan sesiones cortas sin presión.',
                en: "There's already practice today. From here, short sessions without pressure are enough.",
                'pt-BR': "Hoje já houve prática. Depois bastam sessões curtas sem pressão.",
                vi: "Hôm nay đã có luyện tập. Tiếp theo chỉ cần các buổi ngắn, không áp lực.",
                id: "Hari ini sudah ada latihan. Berikutnya cukup sesi singkat tanpa tekanan.",
                tr: "Bugün pratik zaten var. Sonrasında baskısız kısa seanslar yeter.",
                pl: "Dziś ćwiczenie już było. Dalej wystarczą krótkie sesje bez presji.",
            })
            : triLang(lang, {
                ru: 'Первые данные уже есть. Вернись короткой практикой, когда будет удобно.',
                uk: 'Перші дані вже є. Повернись короткою практикою, коли буде зручно.',
                es: 'Ya hay primeros datos. Vuelve con una práctica corta cuando te venga bien.',
                en: "The first data is already in. Come back for a short practice whenever it suits you.",
                'pt-BR': "Os primeiros dados já existem. Volte com uma prática curta quando for conveniente.",
                vi: "Đã có dữ liệu đầu tiên. Quay lại bằng một buổi ngắn khi thuận tiện.",
                id: "Data awal sudah ada. Kembali dengan latihan singkat saat nyaman.",
                tr: "İlk veriler var. Uygun olduğunda kısa bir pratikle dön.",
                pl: "Pierwsze dane już są. Wróć z krótkim ćwiczeniem, gdy będzie wygodnie.",
            });
        actionCta = triLang(lang, {
            ru: 'Открыть тренажер',
            uk: 'Відкрити тренажер',
            es: 'Abrir práctica',
            en: "Open practice",
            'pt-BR': "Abrir prática",
            vi: "Mở luyện tập",
            id: "Buka latihan",
            tr: "Pratiği aç",
            pl: "Otwórz ćwiczenie",
        });
    }
    else if (todayMinutes > 0) {
        actionTitle = triLang(lang, {
            ru: 'Закрепи день тренировкой',
            uk: 'Закріпи день тренуванням',
            es: 'Cierra el día con práctica',
            en: "Cap off the day with practice",
            'pt-BR': "Feche o dia com prática",
            vi: "Kết thúc ngày bằng luyện tập",
            id: "Tutup hari dengan latihan",
            tr: "Günü pratikle kapat",
            pl: "Zamknij dzień ćwiczeniem",
        });
        actionBody = triLang(lang, {
            ru: 'Добавь одну короткую тренировку, чтобы усилить сегодняшний результат.',
            uk: 'Додай одне коротке тренування, щоб посилити сьогоднішній результат.',
            es: 'Suma una práctica corta para reforzar el resultado de hoy.',
            en: "Add one short practice to reinforce today's result.",
            'pt-BR': "Some uma prática curta para reforçar o resultado de hoje.",
            vi: "Thêm một buổi luyện ngắn để củng cố kết quả hôm nay.",
            id: "Tambahkan latihan singkat untuk memperkuat hasil hari ini.",
            tr: "Bugünkü sonucu güçlendirmek için kısa bir pratik ekle.",
            pl: "Dodaj krótkie ćwiczenie, żeby wzmocnić dzisiejszy wynik.",
        });
        actionCta = triLang(lang, {
            ru: 'Открыть тренажер',
            uk: 'Відкрити тренажер',
            es: 'Abrir práctica',
            en: "Open practice",
            'pt-BR': "Abrir prática",
            vi: "Mở luyện tập",
            id: "Buka latihan",
            tr: "Pratiği aç",
            pl: "Otwórz ćwiczenie",
        });
    }
    else if (active7 >= 5) {
        actionTitle = triLang(lang, {
            ru: 'Не ломай хороший темп',
            uk: 'Не ламай хороший темп',
            es: 'No rompas el buen ritmo',
            en: "Don't break a good streak",
            'pt-BR': "Não quebre o bom ritmo",
            vi: "Đừng làm đứt nhịp tốt",
            id: "Jangan putus ritme bagus",
            tr: "İyi ritmi bozma",
            pl: "Nie przerywaj dobrego rytmu",
        });
        actionBody = triLang(lang, {
            ru: 'Неделя сильная. Достаточно маленькой сессии, чтобы сохранить стабильность.',
            uk: 'Тиждень сильний. Достатньо маленької сесії, щоб зберегти стабільність.',
            es: 'La semana va bien. Una sesión pequeña basta para mantener la estabilidad.',
            en: "The week is going well. A small session is enough to keep it stable.",
            'pt-BR': "A semana está indo bem. Uma sessão pequena basta para manter a estabilidade.",
            vi: "Tuần này đang ổn. Một buổi ngắn là đủ để giữ sự ổn định.",
            id: "Minggu ini berjalan baik. Sesi kecil cukup untuk menjaga stabilitas.",
            tr: "Hafta iyi gidiyor. İstikrarı korumak için küçük bir seans yeter.",
            pl: "Tydzień idzie dobrze. Mała sesja wystarczy, żeby utrzymać stabilność.",
        });
    }
    // зачем (results-007, координатор 05.10): столбики «Ваша неделя» — календарная неделя Пн…Вс, как в макете, для всех
    // языков. Понедельник текущей недели всегда не раньше чем 6 дней назад — прошедшие дни берём из rhythmDays.
    const rhythmByDate = new Map(rhythmDays.map((d) => [d.date, d]));
    const calendarWeekDays: (LearningRhythmDay & { isFuture: boolean })[] = [];
    {
        const monday = new Date(`${todayStr}T12:00:00`);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        for (let i = 0; i < 7; i++) {
            const cal = new Date(monday);
            cal.setDate(monday.getDate() + i);
            const date = getLocalDayKey(cal);
            const known = rhythmByDate.get(date);
            calendarWeekDays.push(known ? { ...known, isFuture: false } : {
                date,
                shortLabel: weekWdays[cal.getDay()],
                dayNum: String(cal.getDate()),
                streak: 0,
                active: false,
                minutes: 0,
                combined: 0,
                isToday: false,
                isFuture: date > todayStr,
            });
        }
    }
    // зачем (results-007): подпись строки ритма — по состоянию. «Стабильный ритм» — текст макета; остальные три — короткие
    // фразы в том же тоне (на утверждение владельцу, координатор 05.10).
    const rhythmCaption = isWarmup
        ? triLang(lang, {
            ru: 'Несколько дней подряд — и ритм сложится', uk: 'Кілька днів поспіль — і ритм складеться',
            en: 'A few days in a row and the rhythm will form', es: 'Unos días seguidos y el ritmo se formará',
            'pt-BR': 'Alguns dias seguidos e o ritmo se forma', vi: 'Vài ngày liên tiếp là nhịp sẽ hình thành',
            id: 'Beberapa hari berturut-turut, ritme akan terbentuk', tr: 'Birkaç gün üst üste, ritim oturacak',
            pl: 'Kilka dni z rzędu i rytm się ułoży',
        })
        : score >= 76
            ? triLang(lang, {
                ru: 'Короткие занятия без больших пауз', uk: 'Короткі заняття без великих пауз',
                en: 'Short sessions without long gaps', es: 'Sesiones cortas sin pausas largas',
                'pt-BR': 'Sessões curtas sem pausas longas', vi: 'Buổi học ngắn, không nghỉ quá lâu',
                id: 'Sesi pendek tanpa jeda panjang', tr: 'Uzun ara vermeden kısa çalışmalar',
                pl: 'Krótkie sesje bez długich przerw',
            })
            : score >= 50
                ? triLang(lang, {
                    ru: 'Добавь пару коротких занятий на неделе', uk: 'Додай кілька коротких занять на тижні',
                    en: 'Add a couple of short sessions this week', es: 'Añade un par de sesiones cortas esta semana',
                    'pt-BR': 'Adicione algumas sessões curtas nesta semana', vi: 'Thêm vài buổi học ngắn trong tuần',
                    id: 'Tambahkan beberapa sesi pendek minggu ini', tr: 'Bu hafta birkaç kısa çalışma ekle',
                    pl: 'Dodaj kilka krótkich sesji w tym tygodniu',
                })
                : triLang(lang, {
                    ru: 'Одно короткое занятие сегодня вернёт ритм', uk: 'Одне коротке заняття сьогодні поверне ритм',
                    en: 'One short session today will bring it back', es: 'Una sesión corta hoy lo recuperará',
                    'pt-BR': 'Uma sessão curta hoje traz o ritmo de volta', vi: 'Một buổi ngắn hôm nay sẽ lấy lại nhịp',
                    id: 'Satu sesi pendek hari ini akan memulihkannya', tr: 'Bugün kısa bir çalışma ritmi geri getirir',
                    pl: 'Jedna krótka sesja dziś przywróci rytm',
                });
    return {
        score,
        scoreLabel,
        scoreSubLabel,
        status,
        scoreHint,
        isWarmup,
        calendarWeekDays,
        rhythmCaption,
        active7,
        minutes7,
        avgMinutesActive,
        totalStreak,
        todayMinutes,
        bestDayLabel: bestDay?.shortLabel ?? '-',
        weakDayLabel: weakDay?.shortLabel ?? '-',
        rhythmSummary,
        actionTitle,
        actionBody,
        actionCta,
        scoreColor,
        rhythmDays,
    };
}
function rollingAvg3Series(vals: number[]): number[] {
    const n = vals.length;
    if (n === 0)
        return [];
    return vals.map((_, i) => {
        const i0 = Math.max(0, i - 1);
        const i1 = i;
        const i2 = Math.min(n - 1, i + 1);
        return Math.round((vals[i0] + vals[i1] + vals[i2]) / 3);
    });
}
function lifetimeLineChartContentWidth(n: number): number {
    if (n <= 0)
        return 1;
    return LIFETIME_LINE_CELL * n - LIFETIME_LINE_GAP;
}
function lifetimeChartYForValue(val: number, maxV: number, plotH: number): number {
    const padTop = 8;
    const usableH = Math.max(8, plotH - padTop - 6);
    const ratio = Math.min(1, Math.max(0, val / maxV));
    return padTop + usableH * (1 - ratio);
}
function buildLifetimeLinePoints(values: number[], maxV: number, plotH: number): string {
    const n = values.length;
    if (n === 0 || maxV <= 0)
        return '';
    return values.map((v, i) => {
        const x = LIFETIME_LINE_COL_W / 2 + i * LIFETIME_LINE_CELL;
        const y = lifetimeChartYForValue(v, maxV, plotH);
        return `${x},${y}`;
    }).join(' ');
}
function lifetimeLineChartZeroLevelY(plotH: number): number {
    const padTop = 8;
    const usableH = Math.max(8, plotH - padTop - 6);
    return padTop + usableH;
}
function LifetimePathLineChart({ days, loading, scrollRef, chartTheme, plotFutureDays = false, showSmoothedLine = true, }: {
    days: LifetimeChartDay[];
    loading: boolean;
    scrollRef?: React.RefObject<any> | null;
    chartTheme: LifetimeChartTheme;
    /** Показывать точки и для будущих дат на оси (dev: чтобы видеть все 7 залитых дней). */
    plotFutureDays?: boolean;
    /** Вторая линия — скользящее среднее по 3 дням (rollingAvg3Series). */
    showSmoothedLine?: boolean;
}) {
    const ct = chartTheme;
    if (days.length === 0) {
        return null;
    }
    const chartToday = toDateStr(new Date());
    const visibleDays = days;
    /** Если в хранилище уже есть ненули на будущих датах оси (напр. dev залил 7 дней недели), не обрезаем ряд по «сегодня». */
    const hasFutureValues = visibleDays.some((d) => d.date > chartToday && d.value > 0);
    const useFullAxis = plotFutureDays || hasFutureValues;
    const measuredDays = useFullAxis ? visibleDays : visibleDays.filter((d) => d.date <= chartToday);
    const raw = measuredDays.map((d) => d.value);
    const hasDailyData = raw.some((v) => v > 0);
    const smooth = hasDailyData && showSmoothedLine && !hasFutureValues ? rollingAvg3Series(raw) : [];
    const maxV = hasDailyData
        ? Math.max(1, ...raw, ...(smooth.length > 0 ? smooth : []))
        : 1;
    const chartW = lifetimeLineChartContentWidth(visibleDays.length);
    const chartLen = raw.length;
    /** Одна колонка: polyline из одной пары координат почти не видна — рисуем точку явно. */
    const drawLines = hasDailyData && chartLen >= 2;
    const pointsRed = drawLines ? buildLifetimeLinePoints(raw, maxV, LIFETIME_LINE_PLOT_H) : '';
    const pointsPink = drawLines && showSmoothedLine && smooth.length > 0
        ? buildLifetimeLinePoints(smooth, maxV, LIFETIME_LINE_PLOT_H)
        : '';
    const yZero = lifetimeLineChartZeroLevelY(LIFETIME_LINE_PLOT_H);
    /** Пока нет данных за неделю — маркер на первый день недели слева, не «вперёди» справа. */
    const startDotCx = LIFETIME_LINE_COL_W / 2;
    return (<View style={{
            marginTop: 8,
            marginBottom: 4,
            paddingTop: 4,
        }}>
      <ScrollView ref={scrollRef ?? undefined} decelerationRate="fast" horizontal showsHorizontalScrollIndicator onLayout={() => scrollRef?.current?.scrollTo?.({ x: 0, y: 0, animated: false })}>
        <View>
          <Svg width={chartW} height={LIFETIME_LINE_PLOT_H}>
            {[0, 1, 2, 3, 4].map((g) => {
            const plotBottom = LIFETIME_LINE_PLOT_H - 4;
            const plotTop = 8;
            const y = plotTop + ((plotBottom - plotTop) * g) / 4;
            return (<Line key={`g-${g}`} x1={0} y1={y} x2={chartW} y2={y} stroke={ct.border} strokeWidth={1}/>);
        })}
            {!hasDailyData ? (<Circle cx={startDotCx} cy={yZero} r={4.5} fill={ct.accentText}/>) : chartLen === 1 && raw[0] > 0 ? (<Circle cx={LIFETIME_LINE_COL_W / 2} cy={lifetimeChartYForValue(raw[0], maxV, LIFETIME_LINE_PLOT_H)} r={5} fill={ct.accentText}/>) : (<>
                {pointsPink.length > 0 ? (<Polyline points={pointsPink} fill="none" stroke={ct.accentText} strokeOpacity={0.38} strokeWidth={2.25}/>) : null}
                {pointsRed.length > 0 ? (<Polyline points={pointsRed} fill="none" stroke={ct.accentText} strokeWidth={2.75}/>) : null}
              </>)}
          </Svg>
          <View style={{ flexDirection: 'row', gap: LIFETIME_LINE_GAP, marginTop: 8 }}>
            {visibleDays.map((d, i) => {
            const isToday = d.date === chartToday;
            const isFuture = d.date > chartToday;
            return (<View key={`ltx-${i}`} style={{ width: LIFETIME_LINE_COL_W, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 8, // d145-micro: подпись оси графика в колонке 26 pt, 13 не влезает
                    fontWeight: isToday ? '800' : '500',
                    color: isToday ? ct.accentText : ct.textMuted,
                    opacity: isFuture ? 0.45 : 1,
                }} numberOfLines={1}>
                    {d.shortLabel}
                  </Text>
                  <Text style={{
                    fontSize: 8, // d145-micro: подпись оси графика в колонке 26 pt, 13 не влезает
                    marginTop: 2,
                    fontWeight: isToday ? '800' : '400',
                    color: isToday ? ct.textSecond : ct.textMuted,
                    opacity: isFuture ? 0.45 : 1,
                }}>
                    {d.dayNum}
                  </Text>
                </View>);
        })}
          </View>
        </View>
      </ScrollView>
    </View>);
}
function LifetimeTotalsBlock({ t, f, lang, data, expandedKind, onToggleMetric, chartDays, chartLoading, chartScrollRef, gateExpandAll, teaserChartDays, showAllPathCharts, pathChartsByKind, isGoldTheme, themeMode, }: {
    t: {
        bgCard: string;
        bgSurface: string;
        border: string;
        textPrimary: string;
        textSecond: string;
        textMuted: string;
        accent: string;
        accentText: string; // зачем (Сверка 04:49): акцент как текст — «Все 9», значки, цифры серии
    };
    f: {
        label: number;
        body: number;
        h2: number;
        sub: number;
    };
    lang: Lang;
    data: LifetimeProfileStats;
    expandedKind: LifetimeTotalsChartKind | null;
    onToggleMetric: (kind: LifetimeTotalsChartKind) => void;
    chartDays: LifetimeChartDay[];
    chartLoading: boolean;
    chartScrollRef: React.RefObject<any>;
    /** «Расширить все строки» (редко нужно — по умолчанию только `expandedKind`). */
    gateExpandAll?: boolean;
    teaserChartDays?: LifetimeChartDay[];
    /** Dev: показать график под каждой строкой «Весь путь». */
    showAllPathCharts?: boolean;
    pathChartsByKind?: Partial<Record<LifetimeTotalsChartKind, LifetimeChartDay[]>>;
    isGoldTheme?: boolean;
    themeMode: ThemeMode;
}) {
    const metricRow = (label: string, value: string, kind: LifetimeTotalsChartKind, numValue: number, rowIndex: number = 0) => {
        const multiSeries = showAllPathCharts ? pathChartsByKind?.[kind] : undefined;
        const teaserOk = !!gateExpandAll && teaserChartDays && teaserChartDays.length > 0;
        const rowExpanded = teaserOk || expandedKind === kind || (!!showAllPathCharts && !!multiSeries?.length);
        const showChart = teaserOk || expandedKind === kind || (!!showAllPathCharts && !!multiSeries?.length);
        const daysForChart = teaserOk
            ? teaserChartDays!
            : showAllPathCharts && multiSeries?.length
                ? multiSeries
                : chartDays;
        const loadingForChart = teaserOk ? false : showAllPathCharts && multiSeries?.length ? false : chartLoading;
        return (<React.Fragment key={kind}>
        <TouchableOpacity activeOpacity={0.72} onPress={() => onToggleMetric(kind)} accessibilityRole="button" accessibilityLabel={label}>
          <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 7,
                borderBottomWidth: 0.5, // shadow-ok: разделитель-линия между строками метрик, не контейнер
                borderBottomColor: t.border,
                gap: 8,
            }}>
            <Text style={{ color: t.accentText, fontSize: f.body, flex: 1, fontWeight: '600' }} numberOfLines={2}>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {Number.isFinite(numValue) && numValue > 0 ? (
                <StatCountUpText value={numValue} style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1} delayMs={120 + rowIndex * 70}/>
              ) : (
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                  {value}
                </Text>
              )}
              <Ionicons name={rowExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={t.textMuted}/>
            </View>
          </View>
        </TouchableOpacity>
        {showChart ? (<>
            <Text style={{
                    color: t.textMuted,
                    fontSize: f.sub,
                    marginTop: 8,
                    marginBottom: 2,
                }}>
              {triLang(lang, {
                    ru: 'По дням: текущая и следующая календарные недели',
                    uk: 'За днями: поточний і наступний календарні тижні',
                    es: 'Por días: semana actual y próxima',
                    en: "By day: current and next calendar week",
                    'pt-BR': "Por dia: semana atual e próxima",
                    vi: "Theo ngày: tuần này và tuần tới",
                    id: "Per hari: minggu ini dan berikutnya",
                    tr: "Günlere göre: bu hafta ve gelecek hafta",
                    pl: "Dniami: obecny i następny tydzień",
                })}
            </Text>
            <LifetimePathLineChart days={daysForChart} loading={loadingForChart} scrollRef={teaserOk || (showAllPathCharts && !!multiSeries?.length) ? undefined : chartScrollRef} plotFutureDays={!!showAllPathCharts} showSmoothedLine={!showAllPathCharts} chartTheme={{
                    bgSurface: t.bgSurface,
                    border: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border,
                    textPrimary: t.textPrimary,
                    textSecond: t.textSecond,
                    textMuted: t.textMuted,
                    accentText: t.accentText, // зачем (Сверка): линия и подписи графика — акцент как текст
                }}/>
          </>) : null}
      </React.Fragment>);
    };
    type LifetimeRow = { label: string; numValue: number; kind: LifetimeTotalsChartKind };
    const lifetimeRows: LifetimeRow[] = [
        { kind: 'words_learned', numValue: data.wordsLearned, label: triLang(lang, { ru: 'Слов выучено', uk: 'Слів вивчено', es: 'Palabras aprendidas', en: 'Words learned', 'pt-BR': 'Palavras aprendidas', vi: 'Từ đã học', id: 'Kata dipelajari', tr: 'Öğrenilen kelimeler', pl: 'Nauczone słowa' }) },
        { kind: 'phrases_learned', numValue: data.phrasesLearned, label: triLang(lang, { ru: 'Фраз выучено', uk: 'Висловів вивчено', es: 'Frases aprendidas', en: 'Phrases learned', 'pt-BR': 'Frases aprendidas', vi: 'Cụm từ đã học', id: 'Frasa dipelajari', tr: 'Öğrenilen ifadeler', pl: 'Nauczone zwroty' }) },
        { kind: 'flashcards_saved', numValue: data.flashcardsSaved, label: triLang(lang, { ru: 'Карточек сохранено', uk: 'Карток збережено', es: 'Tarjetas guardadas', en: 'Flashcards saved', 'pt-BR': 'Cartões salvos', vi: 'Thẻ đã lưu', id: 'Kartu disimpan', tr: 'Kaydedilen kartlar', pl: 'Zapisane fiszki' }) },
        // зачем (D70/D78, координатор 01.10): «Монет заработано/потрачено» считали ЖЕМЧУГ (shards) —
        // жемчуг удалён владельцем; строки сняты с экрана, данные уберёт ядро вместе с кодом (PM-289).
    ];
    // В dev/teaser-режимах (gateExpandAll / showAllPathCharts) показываем все строки
    // без сворачивания, иначе прячем нулевые под раскрывашку, чтобы у новичка
    // не было простыни нулей.
    const collapseZeros = !gateExpandAll && !showAllPathCharts;
    const zeroRows = collapseZeros ? lifetimeRows.filter((r) => r.numValue <= 0) : [];
    const [zeroRowsExpanded, setZeroRowsExpanded] = React.useState(false);
    return (<StatsCardArtSurface name="archiveMap" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={[t.bgCard, t.bgCard, t.bgSurface]} radius={18} scrim="stats" style={{
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            }}>
      <Text style={{
            color: isGoldTheme ? GOLD_RICH.champagne : t.accentText,
            fontSize: f.label,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
        }}>
        {triLang(lang, {
            ru: 'За всё время',
            uk: 'За весь час',
            es: 'Total histórico',
            en: "All time",
            'pt-BR': "Total histórico",
            vi: "Tổng từ trước đến nay",
            id: "Total historis",
            tr: "Tüm zamanlar toplamı",
            pl: "Suma historyczna",
        })}
        {/* зачем (Q112, координатор 02.10): сумма идёт по всем языкам аккаунта — подписываем, но только
            если языков с прогрессом больше одного; иначе пометка только путает. */}
        {Object.values(data.byTarget ?? {}).filter((c) => c.wordsLearned + c.phrasesLearned + c.flashcardsSaved > 0).length > 1
            ? ` · ${triLang(lang, { ru: 'по всем языкам', uk: 'усіма мовами', es: 'todos los idiomas', en: 'all languages', 'pt-BR': 'todos os idiomas', vi: 'mọi ngôn ngữ', id: 'semua bahasa', tr: 'tüm diller', pl: 'wszystkie języki' })}`
            : null}
      </Text>
      {lifetimeRows.filter((r) => !collapseZeros || r.numValue > 0).map((r, i) => metricRow(r.label, String(r.numValue), r.kind, r.numValue, i))}
      {zeroRows.length > 0 ? (zeroRowsExpanded ? (<>
          {zeroRows.map((r) => metricRow(r.label, String(r.numValue), r.kind, r.numValue))}
          <TouchableOpacity activeOpacity={0.72} onPress={() => setZeroRowsExpanded(false)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 2 }}>
            <Ionicons name="chevron-up" size={16} color={t.textMuted}/>
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
              {triLang(lang, {
                    ru: 'Свернуть нулевые',
                    uk: 'Згорнути нульові',
                    es: 'Ocultar los vacíos',
                    en: "Hide the zeroes",
                    'pt-BR': "Ocultar os zerados",
                    vi: "Ẩn mục bằng 0",
                    id: "Sembunyikan yang nol",
                    tr: "Sıfırları gizle",
                    pl: "Ukryj zerowe",
                })}
            </Text>
          </TouchableOpacity>
        </>) : (<TouchableOpacity activeOpacity={0.72} onPress={() => setZeroRowsExpanded(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 2 }}>
          <Ionicons name="add-circle-outline" size={17} color={t.textMuted}/>
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang, {
                    ru: `Ещё ${zeroRows.length} — пока по нулям`,
                    uk: `Ще ${zeroRows.length} — поки по нулях`,
                    es: `${zeroRows.length} más — aún sin datos`,
                    en: `${zeroRows.length} more — still at zero`,
                    'pt-BR': `Mais ${zeroRows.length} — ainda sem dados`,
                    vi: `Còn ${zeroRows.length} — chưa có dữ liệu`,
                    id: `${zeroRows.length} lagi — belum ada data`,
                    tr: `${zeroRows.length} tane daha — henüz veri yok`,
                    pl: `Jeszcze ${zeroRows.length} — na razie bez danych`,
                })}
          </Text>
        </TouchableOpacity>)) : null}
    </StatsCardArtSurface>);
}
const LIFETIME_PATH_DEV_CHART_KINDS: LifetimeTotalsChartKind[] = [
    'words_learned',
    'flashcards_saved',
    'phrases_learned',
];
function mergeDevRandomSumsIntoLifetime(base: LifetimeProfileStats, sums: DevLifetimePathRandomSums): LifetimeProfileStats {
    return {
        ...base,
        wordsLearned: sums.wordsLearned,
        flashcardsSaved: sums.flashcardsSaved,
        phrasesLearned: sums.phrasesLearned,
    };
}
/** зачем: achievementCount раньше стартовал с useState(0) и рисовал «Все 0»,
 * пока loadAchievementStates() (AsyncStorage) не отвечал в useFocusEffect —
 * модульный peek запоминает
 * последнее известное значение между открытиями экрана в рамках сессии
 * приложения, так что повторные визиты сразу показывают верное число. */
let achievementCountPeek: number | null = null;
let recentAchievementIdsPeek: string[] | null = null;

/* зачем (PM-191): «Прочность памяти»/CEFR-строка (MemoryGauge, CefrLine) и её
 * JournalMemorySnapshot peek удалены целиком — «Закреплено фраз» была непонятной
 * метрикой без объяснения. Данные журнала ошибок (mistake_practice_insights)
 * не тронуты, только этот эксклюзивный для карточки peek/state/эффект. */

/** зачем: тот же peek-паттерн для вкладки «Активность за год» (Время/Опыт/Год) —
 * primaryMetric раньше стартовал с useState(DEFAULT_STATS_PRIMARY_METRIC) и
 * секцию AsyncStorage.getItem() в useEffect подменял значение чуть позже,
 * из-за чего при каждом повторном открытии экрана в этой же сессии был виден
 * мигающий переброс вкладки (напр. Опыт → Год). Модульный peek запоминает
 * последнее известное/выбранное значение синхронно, так что lazy-инициализатор
 * useState читает его на первом же кадре — без вспышки. Холодный старт
 * процесса (самый первый заход) неизбежно ждёт первого async-чтения один раз. */
let primaryMetricPeek: StatsPrimaryMetric | null = null;

function LearningCoachCard({ t, f, lang, metrics, isGoldTheme, themeMode, showAction, onAction, weekLearned, weekDeltaMinutes, }: {
    t: any;
    f: any;
    lang: Lang;
    metrics: LearningCoachMetrics;
    isGoldTheme: boolean;
    themeMode: ThemeMode;
    showAction: boolean;
    onAction: () => void;
    /** Слова/фразы за последние 7 дней; null — ещё не загружено. */
    weekLearned: { words7: number; phrases7: number } | null;
    /** Минуты этой недели минус минуты прошлой; null — прошлая неделя пустая (нечего сравнивать). */
    weekDeltaMinutes: number | null;
}) {
    const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder
    const isBusiness = false;
    const scoreAccent = isGoldTheme ? GOLD_RICH.champagne : isBusiness ? accentGraphicOf(t) : metrics.scoreColor;
    const scoreSoftBg = isGoldTheme ? GOLD_RICH.wash : isBusiness ? t.accentBg : metrics.scoreColor + '24';
    const scoreBorder = isGoldTheme ? GOLD_RICH.hairlineStrong : t.border;
    // Слияние «Баланс практики» + «Ритм недели»: одна карточка «Твоя неделя».
    // Прежние расплывчатые сигналы («ровно», «держится») заменены конкретными фактами.
    const maxCombined = Math.max(1, ...metrics.rhythmDays.map((d) => d.combined));
    const weekFacts = [
        {
            icon: 'calendar-outline' as const,
            label: triLang(lang, {
                ru: 'Дни',
                uk: 'Дні',
                en: 'Days',
                es: 'Días',
                'pt-BR': "Dias",
                vi: "Ngày",
                id: "Hari",
                tr: "Günler",
                pl: "Dni",
            }),
            value: `${metrics.active7}/7`,
        },
        {
            icon: 'time-outline' as const,
            label: triLang(lang, {
                ru: 'Время',
                uk: 'Час',
                en: 'Time',
                es: 'Tiempo',
                'pt-BR': "Tempo",
                vi: "Thời gian",
                id: "Waktu",
                tr: "Süre",
                pl: "Czas",
            }),
            value: humanMinutes(metrics.minutes7, lang),
        },
    ];
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    return (<StatsCardArtSurface name="practiceBalance" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} scrim="stats" testID="stats-learning-health-card" style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, borderColor: scoreBorder, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : null]}>
      {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <StatScoreRing
          progress={metrics.isWarmup ? Math.min(100, (metrics.active7 / 5) * 100) : metrics.score}
          centerValue={metrics.isWarmup ? metrics.active7 : metrics.score}
          centerSubLabel={metrics.scoreSubLabel}
          accent={scoreAccent}
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? accentGraphicOf(t) : metrics.scoreColor + 'B0'}
          trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(accentGfx.border, 'quiet')}
          size={104}
          strokeWidth={10}
          centerColor={t.textPrimary}
          subColor={t.textMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: scoreAccent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {triLang(lang, {
            ru: 'Твоя неделя',
            uk: 'Твій тиждень',
            en: 'Your week',
            es: 'Tu semana',
            'pt-BR': "Sua semana",
            vi: "Tuần của bạn",
            id: "Minggumu",
            tr: "Haftan",
            pl: "Twój tydzień",
        })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginTop: 4, lineHeight: f.h2 * 1.15 }} numberOfLines={2}>
            {metrics.status}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 6 }}>
            {metrics.scoreHint}
          </Text>
        </View>
      </View>

      {/* График 7 дней — из бывшего «Ритма недели». Подпись — лучший/слабый день. */}
      <View style={{ marginTop: 16, borderRadius: 16, padding: 12, backgroundColor: glassFill(t.bgSurface, 0.46) }}>
        <StatBars
          bars={metrics.rhythmDays.map((d): StatBar => ({
            key: d.date,
            ratio: d.combined / maxCombined,
            active: d.active,
            topLabel: d.minutes > 0 ? humanMinutes(d.minutes, lang) : '',
            bottomLabel: d.shortLabel,
            highlight: d.isToday,
        }))}
          accent={scoreAccent}
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? accentGraphicOf(t) : metrics.scoreColor + 'CC'}
          inactiveColor={accentTint(accentGfx.border, 'quiet')}
          todayDotColor={scoreAccent}
          height={88}
          topLabelColor={t.textPrimary}
          topLabelMutedColor={t.textGhost}
          bottomLabelColor={t.textPrimary}
          bottomLabelMutedColor={t.textMuted}
        />
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, textAlign: 'center' }} numberOfLines={1}>
          {metrics.rhythmSummary}
        </Text>
      </View>

      {/* Дни и время — конкретные факты недели. */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {weekFacts.map((item) => (<View key={item.label} style={{ flex: 1, minWidth: 0, minHeight: 96, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={item.icon} size={18} color={scoreAccent}/>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center', lineHeight: f.body * 1.2 }} numberOfLines={2}>
              {item.value}
            </Text>
            {/* зачем (D145, 04.10): подпись была 9.5 капсом — нечитаемо; подписи короткие («Дни», «Время»), 13 обычным регистром влезает в треть ширины. */}
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginTop: 'auto' }} numberOfLines={1}>
              {item.label}
            </Text>
          </View>))}
      </View>

      {/* Реальный языковой прогресс и сравнение с прошлой неделей — не только игровая валюта. */}
      {weekLearned && (weekLearned.words7 > 0 || weekLearned.phrases7 > 0) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Ionicons name="book-outline" size={16} color={scoreAccent}/>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {(() => {
                const w = weekLearned.words7;
                const p = weekLearned.phrases7;
                const wordsPart = w > 0 ? triLang(lang, {
                    ru: `+${w} ${pluralRu(w, 'слово', 'слова', 'слов')}`,
                    uk: `+${w} ${pluralRu(w, 'слово', 'слова', 'слів')}`,
                    es: `+${w} ${w === 1 ? 'palabra' : 'palabras'}`,
                    en: `+${w} ${w === 1 ? 'word' : 'words'}`,
                    'pt-BR': `+${w} ${w === 1 ? 'palavra' : 'palavras'}`,
                    vi: `+${w} từ`,
                    id: `+${w} kata`,
                    tr: `+${w} kelime`,
                    pl: `+${w} ${w === 1 ? 'słowo' : 'słów'}`,
                }) : '';
                const phrasesPart = p > 0 ? triLang(lang, {
                    ru: `+${p} ${pluralRu(p, 'фраза', 'фразы', 'фраз')}`,
                    uk: `+${p} ${pluralRu(p, 'фраза', 'фрази', 'фраз')}`,
                    es: `+${p} ${p === 1 ? 'frase' : 'frases'}`,
                    en: `+${p} ${p === 1 ? 'phrase' : 'phrases'}`,
                    'pt-BR': `+${p} ${p === 1 ? 'frase' : 'frases'}`,
                    vi: `+${p} cụm từ`,
                    id: `+${p} frasa`,
                    tr: `+${p} kalıp`,
                    pl: `+${p} ${p === 1 ? 'fraza' : 'fraz'}`,
                }) : '';
                const joined = [wordsPart, phrasesPart].filter(Boolean).join(triLang(lang, {
                    ru: ' и ', uk: ' і ', es: ' y ', en: ' and ', 'pt-BR': ' e ', vi: ' và ', id: ' dan ', tr: ' ve ', pl: ' i ',
                }));
                return triLang(lang, {
                    ru: `${joined} за неделю`,
                    uk: `${joined} за тиждень`,
                    es: `${joined} esta semana`,
                    en: `${joined} this week`,
                    'pt-BR': `${joined} esta semana`,
                    vi: `${joined} tuần này`,
                    id: `${joined} minggu ini`,
                    tr: `bu hafta ${joined}`,
                    pl: `${joined} w tym tygodniu`,
                });
            })()}
          </Text>
        </View>) : null}
      {weekDeltaMinutes !== null && Math.abs(weekDeltaMinutes) >= 5 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Ionicons name={weekDeltaMinutes > 0 ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={weekDeltaMinutes > 0 ? EXEMPT_COLOR_1 : t.textMuted}/>
          <Text style={{ color: weekDeltaMinutes > 0 ? EXEMPT_COLOR_2 : t.textMuted, fontSize: f.sub, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {triLang(lang, {
                ru: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'больше' : 'меньше'}, чем неделю назад`,
                uk: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'більше' : 'менше'}, ніж тиждень тому`,
                es: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'más' : 'menos'} que hace una semana`,
                en: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'more' : 'less'} than a week ago`,
                'pt-BR': `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'a mais' : 'a menos'} que há uma semana`,
                vi: `${weekDeltaMinutes > 0 ? 'Nhiều hơn' : 'Ít hơn'} ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} so với tuần trước`,
                id: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'lebih banyak' : 'lebih sedikit'} dari minggu lalu`,
                tr: `Geçen haftadan ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'fazla' : 'az'}`,
                pl: `O ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'więcej' : 'mniej'} niż tydzień temu`,
            })}
          </Text>
        </View>) : null}

      {showAction ? (<View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color={scoreAccent}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>{metrics.actionTitle}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 4 }}>{metrics.actionBody}</Text>
            </View>
          </View>
          <TouchableOpacity testID="legacy-stats-today-action" onPress={onAction} activeOpacity={0.86} style={{ marginTop: 12, borderRadius: 13, paddingVertical: 12, alignItems: 'center', backgroundColor: scoreAccent }}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{metrics.actionCta}</Text>
          </TouchableOpacity>
        </View>) : null}
    </StatsCardArtSurface>);
}

const PRIMARY_METRIC_COPY: Record<StatsPrimaryMetric, {
    ru: string;
    uk: string;
    en: string;
    es: string;
    'pt-BR': string;
    vi: string;
    id: string;
    tr: string;
    pl: string;
}> = {
    time: { ru: 'Время', uk: 'Час', es: 'Tiempo', en: 'Time', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas' },
    year: { ru: 'Год', uk: 'Рік', es: 'Año', en: 'Year', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' },
};

/** Порядок опций сегмент-переключателя недели (как в утверждённом макете). */
const WEEK_SEGMENT_METRICS: readonly StatsPrimaryMetric[] = ['time', 'year'];

/** AsyncStorage-флаг: подсказка «зажми график» гаснет навсегда после первого скраба. */
const STATS_CHART_SCRUB_HINT_KEY = 'stats_chart_scrub_hint_seen_v1';

type StatsSectionThemeProps = {
    t: any;
    f: any;
    lang: Lang;
    themeMode: ThemeMode;
    isGoldTheme: boolean;
};

/** Заливка прогресс-бара с анимацией ширины (Reanimated, каскадная задержка). */
function AnimatedFillBar({ ratio, color, trackColor, height = 10, delayMs = 0, barOpacity = 1 }: {
    ratio: number;
    color: string;
    trackColor: string;
    height?: number;
    delayMs?: number;
    barOpacity?: number;
}) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
    const width = useSharedValue(0);
    useEffect(() => {
        width.value = 0;
        // зачем (координатор 10.10): полосы статистики — kit.css `.trk > i`, 800 мс cubic-bezier(.2,.8,.2,1).
        width.value = withDelay(delayMs, withTiming(clamped, { duration: KIT_MOTION.progressMs, easing: Easing.bezier(KIT_MOTION.progressEase[0], KIT_MOTION.progressEase[1], KIT_MOTION.progressEase[2], KIT_MOTION.progressEase[3]) }));
        return () => { cancelAnimation(width); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clamped, delayMs]);
    const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
    return (
        <View style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: trackColor }}>
            <Reanimated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color, opacity: barOpacity }, fillStyle]} />
        </View>
    );
}

type StreakHeroCardProps = StatsSectionThemeProps & {
    rhythmDays: LearningRhythmDay[];
    totalStreak: number;
    bestStreak: number;
    freezeActive: boolean;
    streakAtRisk: boolean;
    /** зачем: D101 — платной заморозки нет; кнопка видна, только когда защита доступна (Plus-бесплатная или путь к Plus). */
    canFreezeStreak: boolean;
    seriesOpen: boolean;
    onToggleSeries: () => void;
    onFreezeStreak: () => void;
};

function StreakHeroCard({
    t,
    f,
    lang,
    themeMode,
    isGoldTheme,
    rhythmDays,
    totalStreak,
    bestStreak,
    freezeActive,
    streakAtRisk,
    canFreezeStreak,
    seriesOpen,
    onToggleSeries,
    onFreezeStreak,
}: StreakHeroCardProps) {
    const tone = 'streak' as const;
    // зачем (макет results.html RES-08): тап по огню открывает «Стадии серии».
    const [stagesOpen, setStagesOpen] = useState(false);
    // BUG 4: вся карточка — от главного акцента темы (единый hue).
    const accent = isGoldTheme ? GOLD_RICH.champagne : t.accentText; // зачем (Сверка 04:49): «Все 9», значки и цифры серии — акцент как текст (в светлой «Максимум» заливка бледная)
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const streakCaption = triLang(lang, {
        ru: pluralRu(totalStreak, 'день подряд', 'дня подряд', 'дней подряд'),
        uk: pluralRu(totalStreak, 'день поспіль', 'дні поспіль', 'днів поспіль'),
        es: 'días seguidos',
        en: 'days in a row',
        'pt-BR': 'dias seguidos',
        vi: 'ngày liên tiếp',
        id: 'hari berturut-turut',
        tr: 'gün üst üste',
        pl: 'dni z rzędu',
    });
    const recordWord = triLang(lang, { ru: 'рекорд', uk: 'рекорд', en: 'record', es: 'récord', 'pt-BR': 'recorde', vi: 'kỷ lục', id: 'rekor', tr: 'rekor', pl: 'rekord' });
    // зачем (results.html): подпись героя — «дней подряд · лучший 21».
    const bestWord = triLang(lang, { ru: 'лучший', uk: 'найкращий', en: 'best', es: 'mejor', 'pt-BR': 'melhor', vi: 'tốt nhất', id: 'terbaik', tr: 'en iyi', pl: 'najlepszy' });
    const weekDays = rhythmDays.slice(-7);
    // зачем (§137, 04.10): кружки недели молчали для программы чтения с экрана — незрячий не узнавал,
    // какие дни засчитаны. Каждый день теперь подписан: «Пн — засчитан» / «Пн — не засчитан».
    const dayCountedWord = triLang(lang, { ru: 'засчитан', uk: 'зараховано', en: 'counted', es: 'contado', 'pt-BR': 'contado', vi: 'đã tính', id: 'dihitung', tr: 'sayıldı', pl: 'zaliczony' });
    const dayNotCountedWord = triLang(lang, { ru: 'не засчитан', uk: 'не зараховано', en: 'not counted', es: 'sin contar', 'pt-BR': 'não contado', vi: 'chưa tính', id: 'belum dihitung', tr: 'sayılmadı', pl: 'niezaliczony' });
    const streakWord = triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Runtunan', tr: 'Seri', pl: 'Seria' });
    const heroA11yLabel = `${streakWord}: ${totalStreak} ${streakCaption}, ${recordWord} ${bestStreak}. ${weekDays.map((day) => `${day.shortLabel} — ${day.active ? dayCountedWord : dayNotCountedWord}`).join(', ')}`;
    return (
        <StatsCardArtSurface
          testID="stats-streak-hero"
          name={tone}
          theme={t}
          themeMode={themeMode}
          isGoldTheme={isGoldTheme}
          gradientColors={statsCardGradient(t)}
          gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          radius={cardRadius}
          style={[{ borderRadius: cardRadius, padding: 24, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : null]}
        >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            {/* зачем (results.html streak(), решение владельца 04.10 (б)): по центру плитка 61 с огнём, число 46 и
                «дней подряд · лучший N». Нажатие на карточку раскрывает защиту серии, на огонь — «Стадии серии». */}
            <Pressable testID="stats-primary-series" accessibilityRole="button" accessibilityLabel={heroA11yLabel} accessibilityState={{ expanded: seriesOpen }} onPress={onToggleSeries} style={({ pressed }) => [{ alignItems: 'center' }, pressed && { opacity: 0.92 }]}>
                <Pressable
                  testID="stats-streak-stages-open"
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, { ru: 'Стадии серии', uk: 'Стадії серії', en: 'Streak stages', es: 'Etapas de la racha', 'pt-BR': 'Etapas da sequência', vi: 'Các giai đoạn chuỗi', id: 'Tahap rangkaian', tr: 'Seri aşamaları', pl: 'Etapy serii' })}
                  onPress={() => setStagesOpen(true)}
                  style={({ pressed }) => [{ width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.wash : EXEMPT_COLOR_3 }, pressed && { opacity: 0.85 }]}
                >
                    {/* зачем (PM-044, координатор 01.10): огонь, заполняемый до 10 дней; заморозка — свой значок. */}
                    {freezeActive
                      ? <StreakChainIcon themeMode={themeMode} frozen streakDays={totalStreak} size={30} />
                      // зачем (координатор 05.10, Сверка results-007): в плитке — контурный огонь макета (icon flame s28), а не заполняемая капля.
                      : <Ionicons name="flame-outline" size={28} color={totalStreak > 0 ? t.textPrimary : t.textMuted} />}
                </Pressable>
                <Text style={{ color: t.textPrimary, fontSize: 46, lineHeight: 52, fontWeight: '800', marginTop: 10, fontVariant: ['tabular-nums'] }}>{totalStreak}</Text>
                <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 20, textAlign: 'center' }}>{`${streakCaption} · ${bestWord} ${bestStreak}`}</Text>
            </Pressable>
            {seriesOpen ? (
                <Reanimated.View entering={FadeInDown.duration(220)} style={{ gap: 8, paddingTop: 12 }}>
                    <View testID="stats-series-protection-status" style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        <Ionicons name={freezeActive ? 'shield-checkmark-outline' : 'snow-outline'} size={18} color={accent} />
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
                            {/* зачем: «Защита серии доступна при риске» звучало как машинный перевод —
                                живой человек так не скажет. Заменено на streakProtectionStatusLabel
                                (constants/streak_stats_i18n.ts, покрыт тестом) с 3 реальными
                                состояниями: активна сегодня / под угрозой, можно защитить /
                                в безопасности, защита не нужна. */}
                            {streakProtectionStatusLabel(lang, freezeActive, streakAtRisk)}
                        </Text>
                    </View>
                    {streakAtRisk && !freezeActive && canFreezeStreak ? (
                        <TouchableOpacity testID="stats-series-freeze-action" activeOpacity={0.82} onPress={onFreezeStreak} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="snow-outline" size={19} color={accent} />
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                                {triLang(lang, { ru: 'Защитить серию', uk: 'Захистити серію', en: 'Protect streak', es: 'Proteger racha', 'pt-BR': 'Proteger sequência', vi: 'Bảo vệ chuỗi', id: 'Lindungi rangkaian', tr: 'Seriyi koru', pl: 'Chroń serię' })}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </Reanimated.View>
            ) : null}
            <StreakStagesModal visible={stagesOpen} currentDays={totalStreak} onClose={() => setStagesOpen(false)} />
        </StatsCardArtSurface>
    );
}

function WeekAnalyticsCard({
    t,
    f,
    lang,
    metrics,
    isGoldTheme,
    themeMode,
    isPremium,
    premiumAccessResolved,
    statsDevUnlock,
    weekDeltaMinutes,
    metric,
    onSelectMetric,
}: StatsSectionThemeProps & {
    metrics: LearningCoachMetrics;
    isPremium: boolean;
    premiumAccessResolved: boolean;
    statsDevUnlock: boolean;
    weekDeltaMinutes: number | null;
    metric: StatsPrimaryMetric;
    onSelectMetric: (metric: StatsPrimaryMetric) => void;
}) {
    const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder
    // BUG 4: главный акцент темы — единый hue для графика, сегментов и скраб-пузыря.
    const accent = isGoldTheme ? GOLD_RICH.champagne : t.accentText; // зачем (Сверка 04:49): «Все 9», значки и цифры серии — акцент как текст (в светлой «Максимум» заливка бледная)
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const [scrubHintSeen, setScrubHintSeen] = useState(true);
    useEffect(() => {
        let cancelled = false;
        void AsyncStorage.getItem(STATS_CHART_SCRUB_HINT_KEY).then((value) => {
            if (!cancelled && value !== '1') setScrubHintSeen(false);
        }).catch(noteSwallowedHandler('streak_stats:useEffect.getItem'));
        return () => { cancelled = true; };
    }, []);
    const dismissScrubHint = useCallback(() => {
        setScrubHintSeen((seen) => {
            if (!seen) void AsyncStorage.setItem(STATS_CHART_SCRUB_HINT_KEY, '1').catch(noteSwallowedHandler('streak_stats:useCallback.setItem'));
            return true;
        });
    }, []);
    const weeklyBars = useMemo((): StatBar[] => {
        const values = metrics.rhythmDays.map((day) => metric === 'time'
            ? day.minutes
            : (day.active ? 1 : 0));
        const maxValue = Math.max(1, ...values);
        return metrics.rhythmDays.map((day, index): StatBar => {
            const value = values[index] ?? 0;
            return {
                key: day.date,
                ratio: value / maxValue,
                active: value > 0,
                topLabel: metric === 'time'
                    ? (day.minutes > 0 ? humanMinutes(day.minutes, lang) : '')
                    : (day.active ? '✓' : ''),
                scrubLabel: metric === 'time' ? humanMinutes(day.minutes, lang) : (day.active ? '✓' : ''),
                bottomLabel: `${day.shortLabel} ${day.dayNum}`,
                highlight: day.isToday,
            };
        });
    }, [lang, metric, metrics.rhythmDays]);
    const heading = metric === 'time'
            ? humanMinutes(metrics.minutes7, lang)
            : triLang(lang, {
                    ru: 'Активность за год',
                    uk: 'Активність за рік',
                    en: 'Yearly activity',
                    es: 'Actividad anual',
                    'pt-BR': 'Atividade anual',
                    vi: 'Hoạt động cả năm',
                    id: 'Aktivitas tahunan',
                    tr: 'Yıllık aktivite',
                    pl: 'Aktywność roczna',
                });
    const progressParts: string[] = [];
    if (weekDeltaMinutes !== null && Math.abs(weekDeltaMinutes) >= 5) {
        progressParts.push(triLang(lang, {
            // зачем: фраза сравнивает с прошлой неделей, но «чем за предыдущие 7 дней»
            // было только в ru — остальные языки обрывались на «На 53 хв більше»
            // и не говорили, БОЛЬШЕ ЧЕГО. Дописываем базу сравнения во все локали.
            ru: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'больше' : 'меньше'}, чем за предыдущие 7 дней`,
            uk: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'більше' : 'менше'}, ніж за попередні 7 днів`,
            en: `${weekDeltaMinutes > 0 ? 'More' : 'Less'} by ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} than the previous 7 days`,
            es: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'más' : 'menos'} que los 7 días anteriores`,
            'pt-BR': `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'a mais' : 'a menos'} que nos 7 dias anteriores`,
            vi: `${weekDeltaMinutes > 0 ? 'Nhiều hơn' : 'Ít hơn'} ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} so với 7 ngày trước đó`,
            id: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'lebih banyak' : 'lebih sedikit'} dari 7 hari sebelumnya`,
            tr: `Önceki 7 güne göre ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'fazla' : 'az'}`,
            pl: `O ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'więcej' : 'mniej'} niż przez poprzednie 7 dni`,
        }));
    }
    // зачем (владелец, 2026-09-13): раньше под вуалью был только график, а
    // переключатель «Время / Опыт / Год» оставался живым — частичная блокировка.
    // Теперь замок закрывает всю карточку; дизайн замка (lock + gold CTA) прежний.
    return (
      <StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="stats" snapshotKey="learningCoach" devUnlock={statsDevUnlock}>
      <StatsCardArtSurface testID="stats-primary-analytics" name="practiceBalance" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : null]}>
        {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, minWidth: 0, color: t.textPrimary, fontSize: f.h1, fontWeight: '900' }}>
            {heading}
          </Text>
          <View testID="stats-primary-metric-selector" style={{ flexDirection: 'row', borderRadius: 12, padding: 3, backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(t.accent, 'quiet') }}>
            {WEEK_SEGMENT_METRICS.map((option) => {
              const selected = option === metric;
              return (
                <TouchableOpacity key={option} testID={`stats-primary-metric-${option}`} activeOpacity={0.82} onPress={() => {
                    hapticTap();
                    onSelectMetric(option);
                }} style={{ borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: selected ? accent : 'transparent' }}>
                  <Text style={{ color: selected ? t.bgCard : t.textMuted, fontSize: f.label, fontWeight: selected ? '800' : '600' }}>
                    {triLang(lang, PRIMARY_METRIC_COPY[option])}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {metric === 'year' ? (
          <View testID="stats-activity-365" style={{ marginTop: 14 }}>
            <ActivityHeatmap365/>
          </View>
        ) : (
          <View testID="stats-primary-weekly-chart" style={{ marginTop: 18 }}>
            <StatBars
              bars={weeklyBars}
              accent={accent}
              accentSoft={isGoldTheme ? GOLD_RICH.paleGold : accent + 'CC'}
              inactiveColor={isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(accentGfx.border, 'quiet')}
              todayDotColor={accent}
              height={96}
              topLabelColor={t.textPrimary}
              topLabelMutedColor={t.textGhost}
              bottomLabelColor={t.textPrimary}
              bottomLabelMutedColor={t.textMuted}
              scrubEnabled
              scrubHighlightColor={accent}
              scrubBubbleBg={t.bgCard}
              scrubBubbleBorder={isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border}
              scrubValueColor={accent}
              scrubCaptionColor={t.textMuted}
              onScrubStart={dismissScrubHint}
            />
          </View>
        )}

        {metric !== 'year' && !scrubHintSeen ? (
          <Reanimated.View entering={FadeInDown.duration(240)} exiting={FadeOut.duration(250)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            <Ionicons name="hand-left-outline" size={13} color={t.textGhost} />
            <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>{streakChartScrubHint(lang)}</Text>
          </Reanimated.View>
        ) : null}

        {metric !== 'year' ? (<>
          <View testID="stats-primary-summary" style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {[
                { icon: 'calendar-outline' as const, value: `${metrics.active7} ${triLang(lang, { ru: pluralRu(metrics.active7, 'день', 'дня', 'дней'), uk: 'днів', en: 'days', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}` },
                { icon: 'time-outline' as const, value: humanMinutes(metrics.minutes7, lang) },
            ].map((item) => (<View key={item.icon} style={{ flex: 1, minWidth: 0, minHeight: 68, borderRadius: 15, padding: 9, backgroundColor: isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2, borderWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name={item.icon} size={17} color={accent}/>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}>{item.value}</Text>
            </View>))}
          </View>
          {progressParts.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1 /* shadow-ok: разделитель-линия внутри карточки */, borderTopColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }}>
              <Ionicons name={weekDeltaMinutes !== null && weekDeltaMinutes < 0 ? 'trending-down-outline' : 'trending-up-outline'} size={15} color={t.textMuted} />
              <Text style={{ flex: 1, color: t.accentText, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.35 }}>
                {progressParts.join(' · ')}
              </Text>
            </View>
          ) : null}
        </>) : null}
      </StatsCardArtSurface>
      </StatsPremiumBlur>
    );
}

type AllMetricsFoldCardProps = StatsSectionThemeProps & {
    insights: StatsLearningInsights;
    totalStreak: number;
    bestStreak: number;
};

function AllMetricsFoldCard({ t, f, lang, themeMode, isGoldTheme, insights, totalStreak, bestStreak }: AllMetricsFoldCardProps) {
    const [open, setOpen] = useState(false);
    const tone = 'weekRhythm' as const;
    // BUG 4: вся карточка — от главного акцента темы (единый hue).
    const accent = isGoldTheme ? GOLD_RICH.champagne : t.accentText; // зачем (Сверка 04:49): «Все 9», значки и цифры серии — акцент как текст (в светлой «Максимум» заливка бледная)
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const tileBg = isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2;
    const currentMinutes = Math.max(0, insights.weekComparison.currentMinutes);
    const previousMinutes = Math.max(0, insights.weekComparison.previousMinutes);
    const comparisonMax = Math.max(1, currentMinutes, previousMinutes);
    const title = triLang(lang, { ru: 'Все показатели', uk: 'Усі показники', en: 'All stats', es: 'Todos los datos', 'pt-BR': 'Todos os dados', vi: 'Tất cả chỉ số', id: 'Semua statistik', tr: 'Tüm istatistikler', pl: 'Wszystkie statystyki' });
    const subtitle = triLang(lang, { ru: 'рекорды и сравнение', uk: 'рекорди та порівняння', en: 'records and comparison', es: 'récords y comparación', 'pt-BR': 'recordes e comparação', vi: 'kỷ lục và so sánh', id: 'rekor dan perbandingan', tr: 'rekorlar ve karşılaştırma', pl: 'rekordy i porównanie' });
    const bestWeekLabel = triLang(lang, { ru: 'Лучшая неделя', uk: 'Кращий тиждень', en: 'Best week', es: 'Mejor semana', 'pt-BR': 'Melhor semana', vi: 'Tuần tốt nhất', id: 'Minggu terbaik', tr: 'En iyi hafta', pl: 'Najlepszy tydzień' });
    const seriesTileLabel = triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rangkaian', tr: 'Seri', pl: 'Seria' });
    const recordWord = triLang(lang, { ru: 'рекорд', uk: 'рекорд', en: 'record', es: 'récord', 'pt-BR': 'recorde', vi: 'kỷ lục', id: 'rekor', tr: 'rekor', pl: 'rekord' });
    const comparisonTitle = triLang(lang, { ru: 'Неделя к прошлой', uk: 'Тиждень до минулого', en: 'Week vs. last', es: 'Semana vs. anterior', 'pt-BR': 'Semana vs. anterior', vi: 'Tuần so với trước', id: 'Minggu vs. sebelumnya', tr: 'Geçen haftaya göre', pl: 'Tydzień vs. poprzedni' });
    const previousLabel = triLang(lang, { ru: 'прошлая', uk: 'минулий', en: 'last', es: 'anterior', 'pt-BR': 'anterior', vi: 'trước', id: 'sebelumnya', tr: 'önceki', pl: 'poprzedni' });
    const currentLabel = triLang(lang, { ru: 'текущая', uk: 'поточний', en: 'current', es: 'actual', 'pt-BR': 'atual', vi: 'hiện tại', id: 'saat ini', tr: 'şu an', pl: 'bieżący' });
    return (
        <StatsCardArtSurface
          testID="stats-all-metrics-fold"
          name={tone}
          theme={t}
          themeMode={themeMode}
          isGoldTheme={isGoldTheme}
          gradientColors={statsCardGradient(t)}
          gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          radius={cardRadius}
          style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : null]}
        >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            <Pressable onPress={() => { hapticTap(); setOpen((v) => !v); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.92 }]}>
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.wash : accentTint(t.accent) }}>
                    <Ionicons name="trophy-outline" size={20} color={accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>{title}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{subtitle}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.textGhost} />
            </Pressable>
            {open ? (
                <Reanimated.View entering={FadeInDown.duration(220)} style={{ marginTop: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2, backgroundColor: tileBg }}>
                            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{bestWeekLabel}</Text>
                            <Text style={{ color: accent, fontSize: f.bodyLg, fontWeight: '900' }}>{formatCompactDuration(insights.bestWeek.minutes * 60_000, lang)}</Text>
                        </View>
                        <View style={{ flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2, backgroundColor: tileBg }}>
                            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{seriesTileLabel}</Text>
                            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                                {`${totalStreak} ${triLang(lang, {
                                    // зачем (EN_UI_READINESS шаг 3): слово «дней» шло по-русски на всех языках интерфейса
                                    ru: pluralRu(totalStreak, 'день', 'дня', 'дней'),
                                    uk: pluralRu(totalStreak, 'день', 'дні', 'днів'),
                                    en: totalStreak === 1 ? 'day' : 'days',
                                    es: totalStreak === 1 ? 'día' : 'días',
                                    'pt-BR': totalStreak === 1 ? 'dia' : 'dias',
                                    vi: 'ngày',
                                    id: 'hari',
                                    tr: 'gün',
                                    pl: totalStreak === 1 ? 'dzień' : 'dni',
                                })} · ${recordWord} ${bestStreak}`}
                            </Text>
                        </View>
                    </View>
                    <View style={{ borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, gap: 10, backgroundColor: tileBg }}>
                        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>{comparisonTitle}</Text>
                        <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{previousLabel}</Text>
                                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{formatCompactDuration(previousMinutes * 60_000, lang)}</Text>
                            </View>
                            <AnimatedFillBar ratio={previousMinutes / comparisonMax} color={t.textGhost} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : t.bgCard} height={10} barOpacity={0.35} />
                        </View>
                        <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{currentLabel}</Text>
                                <Text style={{ color: accent, fontSize: f.caption, fontWeight: '800' }}>{formatCompactDuration(currentMinutes * 60_000, lang)}</Text>
                            </View>
                            <AnimatedFillBar ratio={currentMinutes / comparisonMax} color={accent} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : t.bgCard} height={10} delayMs={120} />
                        </View>
                    </View>
                </Reanimated.View>
            ) : null}
        </StatsCardArtSurface>
    );
}

function RecentAchievementsCard({
    t,
    f,
    lang,
    themeMode,
    isGoldTheme,
    achievementCount,
    recentIds,
    onPress,
}: {
    t: any;
    f: any;
    lang: Lang;
    themeMode: ThemeMode;
    isGoldTheme: boolean;
    achievementCount: number;
    recentIds: string[];
    onPress: () => void;
}) {
    const latest = recentIds
        .map((id) => ALL_ACHIEVEMENTS.find((achievement) => achievement.id === id))
        .filter((achievement): achievement is NonNullable<typeof achievement> => achievement != null);
    const accent = isGoldTheme ? GOLD_RICH.champagne : t.accentText; // зачем (Сверка 04:49): «Все 9», значки и цифры серии — акцент как текст (в светлой «Максимум» заливка бледная)
    return (<TouchableOpacity testID="stats-recent-achievements" activeOpacity={0.84} onPress={onPress} style={{ paddingHorizontal: 2, paddingVertical: 8, backgroundColor: 'transparent' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
            {triLang(lang, { ru: 'Последние достижения', uk: 'Останні досягнення', es: 'Últimos logros', en: 'Recent achievements', 'pt-BR': 'Últimas conquistas', vi: 'Thành tích mới nhất', id: 'Pencapaian terbaru', tr: 'Son başarılar', pl: 'Ostatnie osiągnięcia' })}
          </Text>
          {/* зачем: при нуле счётчик прячем — «Все 0» в первый день демотивирует
              (интент снятого легаси-блока ruAchievementRewardPhrase); высота ряда
              задаётся заголовком, геометрия при появлении числа не прыгает. */}
          {achievementCount > 0 ? (
            <Text style={{ color: accent, fontSize: f.caption, fontWeight: '900' }}>
              {triLang(lang, { ru: `Все ${achievementCount}`, uk: `Усі ${achievementCount}`, es: `Todos ${achievementCount}`, en: `All ${achievementCount}`, 'pt-BR': `Todas ${achievementCount}`, vi: `Tất cả ${achievementCount}`, id: `Semua ${achievementCount}`, tr: `Tümü ${achievementCount}`, pl: `Wszystkie ${achievementCount}` })}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingLeft: 2 }}>
          {(latest.length > 0 ? latest : [null, null, null, null]).map((achievement, index) => (
            <View key={achievement?.id ?? `empty-${index}`} accessibilityLabel={achievement ? achievementNameForLang(achievement, lang) : undefined} style={{ width: 58, height: 58, marginLeft: index === 0 ? 0 : -9, zIndex: 10 - index, backgroundColor: 'transparent', borderWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
              {achievement
                ? <AchievementArt achievementId={achievement.id} size={58} fallbackIconName={ACHIEVEMENT_ICON[achievement.id] ?? 'trophy'} tintColor={t.textGhost} iconColor={t.bgPrimary} />
                : <Ionicons name="trophy-outline" size={22} color={t.textGhost}/>}
            </View>
          ))}
          <View style={{ flex: 1 }}/>
          <Ionicons name="chevron-forward" size={20} color={t.textMuted}/>
        </View>
    </TouchableOpacity>);
}

// зачем: раздел статистики переезжает на вкладку таббара «Журнал» (решение
// владельца); embedded скрывает кнопку «назад» — у таба её быть не должно.
export default function StreakStats({ embedded = false }: { embedded?: boolean } = {}) {
    const statsRuntimeActive = useRuntimeActive();
    const statsRefreshDirtyRef = useRef(false);
    const router = useRouter();
    const insets = useStableSafeAreaInsets();
    const { theme: t, f, isDark, themeMode, liquidGlassThemeId } = useTheme();
    // зачем (results.html «Серия и статистика»): фон страницы и кнопка «назад» — токены стекла темы.
    const statsGlass = liquidGlassTokens(liquidGlassThemeId);
    const isGoldTheme = themeMode === 'gold';
    const purpleColor = isGoldTheme ? GOLD_RICH.paleGold : isDark ? '#9B59F5' : '#6B21D4'; // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
    const { lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const wdays = streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY);
    // Initialise from pre-loaded cache so the screen shows real data immediately
    const _sc = getStatsCache(studyTarget);
    const [statsReady, setStatsReady] = useState(_sc.loaded);
    // зачем (D158 / PM-214, 04.10): без кэша и с отказом сборки экран навсегда стоял на каркасе.
    // После потолка — спокойное «Сейчас недоступно» + «Попробовать снова»; повтор и при возврате на экран.
    const [statsUnavailable, setStatsUnavailable] = useState(false);
    const [days, setDays] = useState<DayData[]>(() => labelCachedDayRows(_sc.days, wdays));
    const [allDays, setAllDays] = useState<DayData[]>(() => labelCachedDayRows(_sc.allDays, wdays));
    const [allTimeDays, setAllTimeDays] = useState<TimeDayData[]>(() => labelCachedTimeDayRows(_sc.allTimeDays, wdays));
    // зачем (сверка 04.10, правило «сперва логи»): на первом входе после перезапуска столбики недели пустые,
    // пока данные не догрузятся. Трассировка [STREAK-WEEK]: что было в первом кадре и откуда пришло следующее.
    const streakWeekMountAtRef = useRef(Date.now());
    useEffect(() => {
        const week = streakWeekSummary(_sc.allTimeDays);
        if (__DEV__) console.log('[STREAK-WEEK] mount', JSON.stringify({ studyTarget, cacheLoaded: _sc.loaded, rows: _sc.allTimeDays.length, ...week }));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз на монтирование: снимок первого кадра
    }, []);
    // зачем: shortLabel («Ср», «Чт»...) «запекался» в состояние один раз и обновлялся
    // только через useFocusEffect (уход с экрана и возврат). Если язык меняется, пока
    // экран статистики остаётся смонтированным, дни недели оставались на старом языке —
    // тот же класс бага, что и в home.tsx. Релейблим уже загруженные данные локально,
    // без похода в сеть — дёшево и мгновенно.
    useEffect(() => {
        setDays((prev) => prev.map((row) => ({ ...row, shortLabel: wdays[new Date(`${row.date}T12:00:00`).getDay()] ?? row.shortLabel })));
        setAllDays((prev) => prev.map((row) => ({ ...row, shortLabel: wdays[new Date(`${row.date}T12:00:00`).getDay()] ?? row.shortLabel })));
        setAllTimeDays((prev) => prev.map((row) => ({ ...row, shortLabel: wdays[new Date(`${row.date}T12:00:00`).getDay()] ?? row.shortLabel })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);
    const [totalStreak, setTotalStreak] = useState(_sc.totalStreak);
    const [bestStreak, setBestStreak] = useState(_sc.bestStreak);
    const [, setActiveDays] = useState(_sc.activeDays);
    const [, setMyName] = useState(_sc.myName);
    const { hasPremiumAccess: isPremium, devLocalPlusOverride, accessResolved: premiumAccessResolved } = usePremium();
    /** Тестер «Снять премиум»: иначе devUnlock ниже перекрывает блюр, хотя isPremium уже false. */
    const [testerStripsPremium, setTesterStripsPremium] = useState<boolean | null>(() => (ENABLE_DEV_TOOLS ? null : false));
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void AsyncStorage.getItem('tester_no_premium').then((v) => {
            if (!cancelled)
                setTesterStripsPremium(resolveTesterNoPremiumOverride(v));
        }).catch(() => {
            if (!cancelled)
                setTesterStripsPremium(true);
        });
        return () => { cancelled = true; };
    }, []));
    /**
     * В dev-сборках без «магазинного» флага — снимаем блюр и открываем «Весь путь».
     * Не при симуляции бесплатного: ни тестерским «Снять премиум», ни DEV-центром
     * («Фри» = dev_local_plus_override 'removed'). зачем (владелец 2026-09-14):
     * второй механизм раньше не учитывался, и статистика в DEV-«Фри» была открыта.
     */
    const statsDevUnlock = shouldDevUnlockStatsPremiumContent(ENABLE_DEV_TOOLS, testerStripsPremium, devLocalPlusOverride);
    useEffect(() => {
        // Все входы решения в одной строке — следующий вопрос «почему не скрыто» закрывается одним grep.
        console.log('[STATS-GATE]', JSON.stringify({ // guard-ok: одна строка на смену входов, не на кадр; диагностика замка нужна и в проде
            isPremium, enableDevTools: ENABLE_DEV_TOOLS, testerStripsPremium, devLocalPlusOverride, statsDevUnlock,
            blurShown: !isPremium && !statsDevUnlock,
        }));
    }, [isPremium, testerStripsPremium, devLocalPlusOverride, statsDevUnlock]);
    const [freezeActive, setFreezeActive] = useState(_sc.freezeActive);
    const [streakAtRisk, setStreakAtRisk] = useState(_sc.streakAtRisk);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(_sc.premiumFreezeUsed);
    const [, setHadPremiumEver] = useState(_sc.hadPremiumEver);
    // зачем: peek-кэш вместо 0 по умолчанию — иначе «Все 0» на каждом открытии
    // экрана до ответа loadAchievementStates() (см. achievementCountPeek выше).
    const [achievementCount, setAchievementCount] = useState(() => achievementCountPeek ?? 0);
    const [recentAchievementIds, setRecentAchievementIds] = useState<string[]>(() => recentAchievementIdsPeek ?? []);
    // Свёрнут по умолчанию: таблица источников — справка, а не ежедневная ценность.
    const [bonusOpen, setBonusOpen] = useState(false);
    const [seriesOpen, setSeriesOpen] = useState(false);
    const [comparisonOpen, setComparisonOpen] = useState(true);
    // зачем: lazy-инициализатор читает primaryMetricPeek синхронно на первом кадре
    // (см. комментарий у объявления peek выше) — устраняет вспышку дефолтной
    // вкладки перед переключением на последнюю сохранённую (Perf Bible: instant
    // first frame, no default-then-patch).
    const [primaryMetric, setPrimaryMetric] = useState<StatsPrimaryMetric>(() => primaryMetricPeek ?? DEFAULT_STATS_PRIMARY_METRIC);
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void loadAchievementStates()
            .then(states => {
            if (!cancelled) {
                const count = states.filter(s => s.unlockedAt !== null).length;
                const recentIds = recentUnlockedAchievementIds(states, 4);
                // зачем: обновляем peek синхронно с state — следующее открытие
                // экрана в этой сессии сразу стартует с верным числом, без «0».
                achievementCountPeek = count;
                recentAchievementIdsPeek = recentIds;
                setAchievementCount(count);
                setRecentAchievementIds(recentIds);
            }
        })
            .catch(() => {
            if (!cancelled && achievementCountPeek === null) {
                // Настоящей ошибки чтения не прячем только если peek ещё ни разу
                // не наполнялся — иначе экран откатился бы с верного числа на 0.
                setAchievementCount(0);
                setRecentAchievementIds([]);
            }
        });
        return () => { cancelled = true; };
    }, []));
    // зачем (PM-191): эффект, кормивший JournalMemorySnapshot (карточка
    // «Закреплено фраз»/CefrLine), удалён целиком вместе с картой — метрика была
    // непонятной. loadMistakePracticeInsights остаётся импортированным в других
    // модулях памяти и подготовки уроков — общий код не тронут.
    useEffect(() => {
        let cancelled = false;
        const key = statsPrimaryMetricKey(studyTarget);
        void AsyncStorage.getItem(key)
            .then((stored) => {
            const normalized = normalizeStatsPrimaryMetric(stored);
            primaryMetricPeek = normalized;
            if (!cancelled)
                setPrimaryMetric(normalized);
        })
            .catch(noteSwallowedHandler('streak_stats:useEffect.getItem_2'));
        return () => { cancelled = true; };
    }, [studyTarget]);
    const selectPrimaryMetric = useCallback((nextMetric: StatsPrimaryMetric) => {
        // зачем: обновляем peek синхронно с тапом — следующее открытие экрана
        // в этой сессии стартует сразу с этой вкладкой, без ожидания AsyncStorage.
        primaryMetricPeek = nextMetric;
        setPrimaryMetric(nextMetric);
        void AsyncStorage.setItem(statsPrimaryMetricKey(studyTarget), nextMetric).catch(noteSwallowedHandler('streak_stats:useCallback.setItem_2'));
    }, [studyTarget]);
    const scrollRef = useRef<any>(null);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const chartScrollRef = useRef<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const today = toDateStr(new Date());
    const [lifetimeStats, setLifetimeStats] = useState<LifetimeProfileStats | null>(null);
    const [time7Percentile, setTime7Percentile] = useState<number | null>(null);
    const [myTime7ms, setMyTime7ms] = useState(0);
    const coachMetrics = useMemo(() => buildLearningCoachMetrics(allDays.length > 0 ? allDays : days, allTimeDays, totalStreak, lang), [allDays, days, allTimeDays, totalStreak, lang]);
    // зачем (Сверка results-007: неделя «Вт…Пн», в макете «Пн…Вс»; подпись ритма «Лучший день…» против
    // «Короткие занятия без больших пауз»): какие дни попали в столбики и какая подпись выбрана — одна строка на изменение.
    const resultsWeekTraceKey = `${coachMetrics.calendarWeekDays.map((d) => `${d.date}:${d.minutes}`).join(',')}|${coachMetrics.status}|${coachMetrics.rhythmCaption}|${lang}`;
    useEffect(() => {
        console.warn('[RESULTS-WEEK] bars', JSON.stringify({
            lang,
            days: coachMetrics.calendarWeekDays.map((d) => ({ date: d.date, label: d.shortLabel, min: d.minutes, today: d.isToday, future: d.isFuture, active: d.active })),
            status: coachMetrics.status,
            rhythmCaption: coachMetrics.rhythmCaption,
            source: allDays.length > 0 ? 'allDays' : 'days',
        })); // guard-ok: временная трассировка results-007
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resultsWeekTraceKey]);
    const learningInsights = useMemo(() => {
        const timeByDate = new Map(allTimeDays.map((day) => [day.date, day.ms]));
        return buildStatsLearningInsights((allDays.length > 0 ? allDays : days).map((day) => ({
            date: day.date,
            foregroundMs: timeByDate.get(day.date) ?? 0,
            active: (timeByDate.get(day.date) ?? 0) >= 60_000,
        })));
    }, [allDays, allTimeDays, days]);
    // Слова/фразы за 7 дней — для строки прогресса в «Твоей неделе».
    const [weekLearned, setWeekLearned] = useState<{ words7: number; phrases7: number } | null>(null);
    // Минуты этой недели против прошлой; null — прошлая неделя пустая, сравнивать не с чем.
    const weekDeltaMinutes = useMemo(() => {
        if (allTimeDays.length < 8) return null;
        const sumMinutes = (rows: TimeDayData[]) => Math.round(rows.reduce((s, d) => s + Math.max(0, d.ms), 0) / 60000);
        const cur = sumMinutes(allTimeDays.slice(-7));
        const prevRows = allTimeDays.slice(-14, -7);
        const prev = sumMinutes(prevRows);
        if (prevRows.length < 7 || prev <= 0) return null;
        return cur - prev;
    }, [allTimeDays]);
    const [expandedLifetimeKind, setExpandedLifetimeKind] = useState<LifetimeTotalsChartKind | null>(null);
    const [lifetimeChartDays, setLifetimeChartDays] = useState<LifetimeChartDay[]>([]);
    const [lifetimeChartLoading, setLifetimeChartLoading] = useState(false);
    /** Сброс загрузки графиков «Весь путь» после dev-рандома (AsyncStorage). */
    const [lifetimeChartSeed, setLifetimeChartSeed] = useState(0);
    const [devLifetimeChartsBusy, setDevLifetimeChartsBusy] = useState(false);
    /** Dev: графики под всеми строками «Весь путь» + серии по каждой метрике */
    const [devLifetimeAllCharts, setDevLifetimeAllCharts] = useState(false);
    const [lifetimePathChartsByKind, setLifetimePathChartsByKind] = useState<Partial<Record<LifetimeTotalsChartKind, LifetimeChartDay[]>>>({});
    const lifetimeChartScrollRef = useRef<any>(null);
    const params = useLocalSearchParams<{
        qa365?: string;
    }>();
    useEffect(() => {
        if (params.qa365 === '1')
            setPrimaryMetric('year');
    }, [params.qa365]);
    useEffect(() => {
        if (devLifetimeAllCharts)
            return;
        if (!expandedLifetimeKind) {
            setLifetimeChartDays([]);
            setLifetimeChartLoading(false);
            return;
        }
        let cancelled = false;
        setLifetimeChartLoading(true);
        setLifetimeChartDays([]);
        loadLifetimeTotalsChartDays(expandedLifetimeKind, lang, REPORT_SCREENS_RUSSIAN_ONLY)
            .then(series => {
            if (!cancelled && series)
                setLifetimeChartDays(series);
        })
            .catch((error: unknown) => {
            console.warn('[STATS-GATE] lifetimeChart:failed', JSON.stringify({ kind: expandedLifetimeKind, error: String((error as Error)?.message ?? error).slice(0, 160) }));
            if (!cancelled)
                setLifetimeChartDays([]);
        })
            .finally(() => {
            if (!cancelled)
                setLifetimeChartLoading(false);
        });
        return () => { cancelled = true; };
    }, [expandedLifetimeKind, lang, lifetimeChartSeed, devLifetimeAllCharts]);
    useEffect(() => {
        if (!expandedLifetimeKind || devLifetimeAllCharts)
            return;
        const id = requestAnimationFrame(() => {
            lifetimeChartScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
        });
        return () => cancelAnimationFrame(id);
    }, [expandedLifetimeKind, lifetimeChartDays, devLifetimeAllCharts]);
    const applyStatsSnapshot = React.useCallback((snapshot: StatsPreloadData) => {
        setStatsReady(true);
        setStatsUnavailable(false);
        setDays(labelCachedDayRows(snapshot.days, wdays));
        setAllDays(labelCachedDayRows(snapshot.allDays, wdays));
        setAllTimeDays(labelCachedTimeDayRows(snapshot.allTimeDays, wdays));
        setTotalStreak(snapshot.totalStreak);
        setBestStreak(snapshot.bestStreak);
        setActiveDays(snapshot.activeDays);
        setMyName(snapshot.myName);
        setFreezeActive(snapshot.freezeActive);
        setPremiumFreezeUsed(snapshot.premiumFreezeUsed);
        setStreakAtRisk(snapshot.streakAtRisk);
        setHadPremiumEver(snapshot.hadPremiumEver);
    }, [wdays]);
    const loadAll = React.useCallback(async () => {
        debugStatsRoute('loadAll:start');
        // зачем (PM-214): loadAll зовут через `void` — исключение здесь было бы необработанным отказом,
        // а экран без данных оставался бы на каркасе без единой строки в журнале.
        try {
            await hydrateStatsCacheFromStorage();
            const cachedSnapshot = getStatsCache(studyTarget);
            debugStatsRoute('loadAll:cache', { loaded: cachedSnapshot.loaded });
            if (__DEV__) console.log('[STREAK-WEEK] source=disk', JSON.stringify({ studyTarget, loaded: cachedSnapshot.loaded, rows: cachedSnapshot.allTimeDays.length, sinceMountMs: Date.now() - streakWeekMountAtRef.current, ...streakWeekSummary(cachedSnapshot.allTimeDays) }));
            if (cachedSnapshot.loaded)
                applyStatsSnapshot(cachedSnapshot);
            const snapshot = await refreshStatsCache(studyTarget);
            if (__DEV__) console.log('[STREAK-WEEK] source=network', JSON.stringify({ studyTarget, ok: Boolean(snapshot), rows: snapshot?.allTimeDays.length ?? null, sinceMountMs: Date.now() - streakWeekMountAtRef.current, ...(snapshot ? streakWeekSummary(snapshot.allTimeDays) : {}) }));
            debugStatsRoute('loadAll:refreshStatsCache', { ok: !!snapshot });
            if (snapshot)
                applyStatsSnapshot(snapshot);
            else if (!cachedSnapshot.loaded) {
                console.warn('[STATS-GATE] loadAll:no_snapshot → unavailable', JSON.stringify({ studyTarget }));
                setStatsUnavailable(true);
            }
        }
        catch (error) {
            console.warn('[STATS-GATE] loadAll:failed', JSON.stringify({ studyTarget, error: String((error as Error)?.message ?? error).slice(0, 160) }));
            if (!getStatsCache(studyTarget).loaded)
                setStatsUnavailable(true);
            return;
        }
        loadWeeklyLearnedCounts(studyTarget)
            .then((counts) => setWeekLearned(counts))
            .catch((error: unknown) => {
            console.warn('[STATS-GATE] weeklyLearned:failed', String((error as Error)?.message ?? error).slice(0, 160));
            setWeekLearned(null);
        });
        // Синк аналитики + перцентиль (не блокирует рендер — запускаем после основной загрузки)
        void syncDailyAnalyticsIfNeeded();
        loadPercentileData().then(({ myTime7ms: t7, percentiles: p }) => {
            debugStatsRoute('loadAll:percentiles', { t7, daily7timeMs: p.daily7timeMs });
            setMyTime7ms(t7);
            setTime7Percentile(p.daily7timeMs);
        }).catch((error) => { debugStatsRoute('loadAll:percentilesError', String(error)); });
    }, [applyStatsSnapshot, studyTarget]);
    const requestStatsRefresh = React.useCallback(() => {
        if (!statsRuntimeActive) {
            statsRefreshDirtyRef.current = true;
            return;
        }
        statsRefreshDirtyRef.current = false;
        void loadAll();
    }, [loadAll, statsRuntimeActive]);
    // Reload data when screen regains focus (e.g. after tester functions).
    useFocusEffect(React.useCallback(() => {
        requestStatsRefresh();
        return undefined;
    }, [requestStatsRefresh]));
    useEffect(() => {
        if (!statsRuntimeActive || !statsRefreshDirtyRef.current) return;
        requestStatsRefresh();
    }, [requestStatsRefresh, statsRuntimeActive]);
    // зачем (D158): потолок ожидания каркаса — сборка, не ответившая ни данными, ни ошибкой.
    useEffect(() => {
        if (statsReady || statsUnavailable || !statsRuntimeActive) return undefined;
        const timer = setTimeout(() => {
            console.warn('[STATS-GATE] skeleton:ceiling → unavailable', JSON.stringify({ ceilingMs: LOAD_GATE_TOTAL_MS, studyTarget }));
            setStatsUnavailable(true);
        }, LOAD_GATE_TOTAL_MS);
        return () => clearTimeout(timer);
    }, [statsReady, statsUnavailable, statsRuntimeActive, studyTarget]);
    const retryStatsLoad = React.useCallback(() => {
        console.warn('[STATS-GATE] retry:tap');
        hapticTap();
        setStatsUnavailable(false);
        void loadAll();
    }, [loadAll]);
    const randomizeLifetimeChartsForDev = React.useCallback(async () => {
        if (!ENABLE_DEV_TOOLS)
            return;
        hapticTap();
        setDevLifetimeChartsBusy(true);
        try {
            const sums = await devRandomizeLifetimePathDailyMetrics(7);
            setLifetimeChartSeed((s) => s + 1);
            setExpandedLifetimeKind(null);
            await loadAll();
            const base = await loadLifetimeProfileStats();
            setLifetimeStats(mergeDevRandomSumsIntoLifetime(base, sums));
            const byKind: Partial<Record<LifetimeTotalsChartKind, LifetimeChartDay[]>> = {};
            await Promise.all(LIFETIME_PATH_DEV_CHART_KINDS.map(async (k) => {
                const series = await loadLifetimeTotalsChartDays(k, lang, REPORT_SCREENS_RUSSIAN_ONLY);
                if (series)
                    byKind[k] = series;
            }));
            setLifetimePathChartsByKind(byKind);
            setDevLifetimeAllCharts(true);
        }
        finally {
            setDevLifetimeChartsBusy(false);
        }
    }, [loadAll, lang]);
    useEffect(() => {
        debugStatsRoute('renderState', {
            statsReady,
            days: days.length,
            allDays: allDays.length,
            allTimeDays: allTimeDays.length,
            lifetimeStats: !!lifetimeStats,
            time7Percentile,
            myTime7ms,
            detailsOpen,
            bonusOpen,
            statsDevUnlock,
            isPremium,
        });
    }, [allDays.length, allTimeDays.length, bonusOpen, days.length, detailsOpen, isPremium, lifetimeStats, myTime7ms, time7Percentile, statsDevUnlock, statsReady]);
    // зачем: D101 — заморозка и восстановление серии за жемчуг удалены; осталась
    // только бесплатная заморозка Plus (один раз), без Plus — путь к Plus.
    const canFreezeStreak = !isPremium || !premiumFreezeUsed;
    // зачем (аудит Optimistic UI, 04.10): раньше кнопка менялась только ПОСЛЕ записи, повторный тап шёл параллельно, а отказ молчал
    // (только лог). Теперь: замок от повторных тапов, состояние меняется сразу, при отказе — откат и тост.
    const freezeInFlightRef = useRef(false);
    const handleFreezeStreak = async () => {
        hapticTap();
        if (!isPremium) {
            router.push({ pathname: '/premium_modal', params: { context: 'streak', source: 'stats_streak', streak: String(totalStreak) } } as any);
            return;
        }
        if (premiumFreezeUsed) {
            DebugLogger.warn('STREAK-FREEZE', 'stats: premium free freeze already used, paid freeze removed (D101)');
            return;
        }
        if (freezeInFlightRef.current) {
            DebugLogger.warn('STREAK-FREEZE', 'stats: freeze tap ignored — previous commit still in flight');
            return;
        }
        freezeInFlightRef.current = true;
        const previous = { freezeActive, premiumFreezeUsed, streakAtRisk };
        setPremiumFreezeUsed(true);
        setFreezeActive(true);
        setStreakAtRisk(false);
        try {
            await commitPremiumFreeFreeze(toDateStr(new Date()));
            emitAppEvent('streak_freeze_updated', { active: true });
        } catch (error) {
            DebugLogger.error('streak_stats:premiumFreeFreeze', error, 'warning');
            setPremiumFreezeUsed(previous.premiumFreezeUsed);
            setFreezeActive(previous.freezeActive);
            setStreakAtRisk(previous.streakAtRisk);
            emitAppEvent('action_toast', actionToastTri('error', {
                ru: 'Не удалось включить заморозку. Попробуй ещё раз.',
                uk: 'Не вдалося увімкнути заморозку. Спробуй ще раз.',
                es: 'No se pudo activar la congelación. Inténtalo de nuevo.', en: 'Couldn\'t turn on the freeze. Try again.',
                'pt-BR': 'Não foi possível ativar o congelamento. Tente de novo.', vi: 'Không bật được đóng băng chuỗi. Hãy thử lại.', id: 'Pembekuan streak tidak bisa diaktifkan. Coba lagi.', tr: 'Seri dondurma açılamadı. Tekrar dene.', pl: 'Nie udało się włączyć zamrożenia serii. Spróbuj ponownie.',
            }));
        } finally {
            freezeInFlightRef.current = false;
        }
    };
    // зачем: строка ритма (results.html) ведёт к подробной аналитике недели — запоминаем её место в прокрутке.
    const weekAnalyticsYRef = useRef(0);
    const weekAnalyticsBlock = (
        <Reanimated.View key="week-analytics" entering={FadeInDown.duration(420).delay(210)} onLayout={(event) => { weekAnalyticsYRef.current = event.nativeEvent.layout.y; }}>
          <WeekAnalyticsCard
            t={t}
            f={f}
            lang={lang}
            metrics={coachMetrics}
            isGoldTheme={isGoldTheme}
            themeMode={themeMode}
            isPremium={isPremium}
            premiumAccessResolved={premiumAccessResolved}
            statsDevUnlock={statsDevUnlock}
            weekDeltaMinutes={weekDeltaMinutes}
            metric={primaryMetric}
            onSelectMetric={selectPrimaryMetric}
          />
        </Reanimated.View>
    );
    const allMetricsTitle = triLang(lang, { ru: 'Все показатели', uk: 'Усі показники', en: 'All stats', es: 'Todos los datos', 'pt-BR': 'Todos os dados', vi: 'Tất cả chỉ số', id: 'Semua statistik', tr: 'Tüm istatistikler', pl: 'Wszystkie statystyki' });
    const allMetricsBlock = (
        <Reanimated.View key="all-metrics" entering={FadeInDown.duration(420).delay(280)}>
          <StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="stats" snapshotKey="lifetimeTotals" overrideTitle={allMetricsTitle} devUnlock={statsDevUnlock}>
            <AllMetricsFoldCard
              t={t}
              f={f}
              lang={lang}
              themeMode={themeMode}
              isGoldTheme={isGoldTheme}
              insights={learningInsights}
              totalStreak={totalStreak}
              bestStreak={bestStreak}
            />
          </StatsPremiumBlur>
        </Reanimated.View>
    );
    const percentilesBlock = (() => {
        const pItems: {
            icon: keyof typeof Ionicons.glyphMap;
            color: string;
            label: string;
            percent: number;
        }[] = [];
        const time7 = visiblePercentile(time7Percentile, myTime7ms > 0);
        if (time7 !== null) pItems.push({
            icon: 'time-outline',
            color: isGoldTheme ? GOLD_RICH.paleGold : t.accentText,
            percent: time7,
            label: triLang(lang, { ru: 'Время за 7 дней', uk: 'Час за 7 днів', es: 'Tiempo en 7 días', en: 'Time in 7 days', 'pt-BR': 'Tempo em 7 dias', vi: 'Thời gian 7 ngày', id: 'Waktu 7 hari', tr: '7 günde süre', pl: 'Czas w 7 dni' }),
        });
        if (pItems.length === 0 && (isPremium || statsDevUnlock)) return null;
        if (pItems.length === 0) {
          return (
            <Reanimated.View key="percentiles-locked" entering={FadeInDown.duration(420).delay(420)}>
              <StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
                <View />
              </StatsPremiumBlur>
            </Reanimated.View>
          );
        }
        return (
          <Reanimated.View key="percentiles" entering={FadeInDown.duration(420).delay(420)}>
          <StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
            <StatsCardArtSurface testID="stats-comparison-content" name="percentiles" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 16, borderWidth: 0, overflow: 'hidden' }, !isGoldTheme ? null : null]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Среди других', uk: 'Серед інших', en: 'Among others', es: 'Entre otros', 'pt-BR': 'Entre outros', vi: 'So với người khác', id: 'Di antara yang lain', tr: 'Diğerleri arasında', pl: 'Na tle innych' })}
                </Text>
              </View>
              {(() => {
                  const bestItem = pItems.reduce((best, item) => (item.percent > best.percent ? item : best));
                  const topN = Math.max(1, 100 - bestItem.percent);
                  return (
                    <View style={{ marginBottom: 14, gap: 2 }}>
                      <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : t.accentText, fontSize: f.numLg, fontWeight: '900' }}>
                        {`${triLang(lang, { ru: 'Топ', uk: 'Топ', en: 'Top', es: 'Top', 'pt-BR': 'Top', vi: 'Top', id: 'Top', tr: 'Top', pl: 'Top' })}‑${topN}%`}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{bestItem.label}</Text>
                    </View>
                  );
              })()}
              <View style={{ gap: 16 }}>
                {pItems.map((item, idx) => (
                  <StatProgressRow key={item.label} percent={item.percent} label={item.label} icon={item.icon} accent={item.color} accentSoft={item.color + 'AA'} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : accentTint(statsGlass.accentBorder, 'quiet')} iconChipBg={item.color + '24'} labelColor={t.textPrimary} valueColor={item.color} delayMs={120 + idx * 110}/>
                ))}
              </View>
            </StatsCardArtSurface>
          </StatsPremiumBlur>
          </Reanimated.View>
        );
    })();
    // зачем (results.html back(), решение владельца 04.10 (б)): голая «‹» и заголовок 34 под ней, без линии снизу.
    const statsHeader = (
        <View style={{ paddingHorizontal: 20, paddingTop: embedded ? 4 : 2, paddingBottom: 4, zIndex: 2 /* зачем (D158): шапка с «назад» выше панели «Сейчас недоступно» */ }}>
          <View style={{ alignItems: 'flex-start' }}>
          {!embedded && (<TapScale
            onPress={() => {
              safeRouterBack(router, '/(tabs)/home' as any);
            }}
            hitSlop={10}
            style={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={21} color={statsGlass.text}/>
          </TapScale>)}
          <FlowText
            testID="stats-header-title"
            provenance="authored"
            style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: embedded ? 0 : 10 }}
          >
            {triLang(lang, {
              ru: 'Серия и результаты',
              uk: 'Серія і результати',
              en: 'Streak and results',
              es: 'Racha y resultados',
              'pt-BR': 'Sequência e resultados',
              vi: 'Chuỗi và kết quả',
              id: 'Rangkaian dan hasil',
              tr: 'Seri ve sonuçlar',
              pl: 'Seria i wyniki',
          })}
          </FlowText>
          {/* зачем (D49, владелец 2026-10-01): кнопка «Подарки» показывала только подарки
              «Дневного пути» — фича удалена целиком, кнопку убрали вместе с ней. */}
          </View>
        </View>
    );
    return (
        <View style={{ flex: 1, backgroundColor: statsGlass.bg }}>
            <FeatureIntroEntry id="statistics_first_visit" enabled={statsRuntimeActive} />
            <StatsArtBackdrop />
            <SafeAreaView testID="screen-streak-stats" style={{ flex: 1 }}>

              <ContentWrap>
              <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
              {/* зачем (Сверка results-007 🔴, 05.10): в макете «‹» и заголовок лежат ВНУТРИ прокрутки (.scr > .in) и уезжают
                  вместе с контентом. Неподвижный заголовок 34 без фона выглядел налезающим на прокрученные блоки.
                  Пока данных нет (заготовка / «Сейчас недоступно») прокрутка не принимает касаний — тогда шапка снаружи,
                  чтобы «назад» работала (D158). */}
              {!statsReady ? statsHeader : null}

              {/* зачем: раньше при statsReady=false ScrollView рендерился с opacity:0 —
                  первый кадр был полностью пустым (только шапка), а весь контент
                  «впрыгивал» целиком, когда loadAll() догружался. Держим геометрию
                  загруженного экрана скелетоном (шапка героя, legacy reward-карта, недельный
                  график, ряд достижений), как в рабочем состоянии экрана. */}
              {/* зачем (D158, кадр 04.10): панель лежала поверх заготовки без своего фона — «Сейчас недоступно» накладывалось на мерцающие блоки. Непрозрачный фон экрана делает её чистым блоком по центру. */}
              {!statsReady && statsUnavailable ? (
                <View testID="stats-unavailable" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 1, backgroundColor: statsGlass.bg }}>
                  <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', textAlign: 'center' }}>
                    {triLang(lang, { ru: 'Сейчас недоступно', uk: 'Зараз недоступно', es: 'No disponible ahora', en: 'Not available right now', 'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne' })}
                  </Text>
                  <Pressable testID="stats-try-again" accessibilityRole="button" onPress={retryStatsLoad} style={({ pressed }) => [{ minHeight: 48, paddingHorizontal: 22, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface2 }, pressed && { opacity: 0.85 }]}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                      {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще', es: 'Intentar de nuevo', en: 'Try again', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                    </Text>
                  </Pressable>
                </View>
              ) : !statsReady ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16, gap: 12 }}>
                  <SkeletonBlock width="100%" height={200} borderRadius={22} />
                  <SkeletonBlock width="100%" height={168} borderRadius={22} />
                  <SkeletonBlock width="100%" height={92} borderRadius={22} />
                  <SkeletonBlock width="100%" height={230} borderRadius={22} />
                  <SkeletonBlock width="100%" height={90} borderRadius={22} />
                </View>
              ) : null}
              <BouncyWrap>
              <Reanimated.ScrollView ref={scrollRef} decelerationRate="fast" bounces alwaysBounceVertical overScrollMode="always" pointerEvents={statsReady ? 'auto' : 'none'} style={{ opacity: statsReady ? 1 : 0 }} contentContainerStyle={{ padding: 16, paddingBottom: embedded ? 140 : 16 }} showsVerticalScrollIndicator={false} onScroll={onAnimatedScroll} scrollEventThrottle={16}>
                {/* шапка в прокрутке: компенсируем поля контейнера 16, зазор до первой карточки прежний (4 + 16) */}
                {statsReady ? <View style={{ marginHorizontal: -16, marginTop: -16, marginBottom: 16 }}>{statsHeader}</View> : null}
                <View style={{ gap: 12 }}>
                {/* зачем (PM-191): карточка «Закреплено фраз» (CefrLine, testID
                    journal-memory-card) удалена целиком — непонятная метрика без
                    объяснения. Следующая карточка сдвинута на первую позицию. */}
                <Reanimated.View entering={FadeInDown.duration(420).delay(0)}>
                  <StreakHeroCard
                    t={t}
                    f={f}
                    lang={lang}
                    themeMode={themeMode}
                    isGoldTheme={isGoldTheme}
                    rhythmDays={coachMetrics.rhythmDays}
                    totalStreak={totalStreak}
                    bestStreak={bestStreak}
                    freezeActive={freezeActive}
                    streakAtRisk={streakAtRisk}
                    canFreezeStreak={canFreezeStreak}
                    seriesOpen={seriesOpen}
                    onToggleSeries={() => {
                      hapticTap();
                      setSeriesOpen(value => !value);
                    }}
                    onFreezeStreak={handleFreezeStreak}
                  />
                </Reanimated.View>
                {/* зачем (results.html streak(), решение владельца 04.10 (б)): под серией «Ваша неделя» столбиками и строка
                    ритма — точно по макету. Подробная аналитика недели и всё прежнее остаются ниже без изменений. */}
                <View testID="stats-week-spark" style={{ borderRadius: 14, padding: 18, backgroundColor: statsGlass.plateFillFrom, boxShadow: plateBoxShadow(statsGlass) /* «Тень» 12.10: плашка без кромки */ }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: 19, lineHeight: 24, fontWeight: '700' }}>
                      {triLang(lang, { ru: 'Твоя неделя', uk: 'Твій тиждень', en: 'Your week', es: 'Tu semana', 'pt-BR': 'Sua semana', vi: 'Tuần của bạn', id: 'Minggumu', tr: 'Haftan', pl: 'Twój tydzień' })}
                    </Text>
                    {/* зачем (`.value`): вторичный тон; макет 14, шкала D145 — 13. */}
                    <Text style={{ color: statsGlass.secondary, fontSize: 13, lineHeight: 18 }}>{humanMinutes(coachMetrics.calendarWeekDays.reduce((sum, day) => sum + day.minutes, 0), lang)}</Text>
                  </View>
                  {(() => {
                    // зачем (results-007): календарная неделя Пн…Вс; будущие дни — пустые низкие столбики.
                    const days = coachMetrics.calendarWeekDays;
                    const maxMinutes = Math.max(1, ...days.map((day) => day.minutes));
                    const idle = statsGlass.text.length === 7 ? `${statsGlass.text}47` : statsGlass.mutedText;
                    return (
                      <>
                        {/* `.spark`: 72 высотой, промежуток 6, скругление 5/5/2/2; сегодняшний столбик светлый. */}
                        <View style={{ height: 72, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                          {days.map((day) => (
                            <View key={day.date} style={{ flex: 1, height: `${Math.max(8, Math.round((day.minutes / maxMinutes) * 100))}%`, minHeight: 6, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: day.isToday ? statsGlass.text : idle }} />
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                          {days.map((day) => (
                            <Text key={day.date} style={{ color: statsGlass.mutedText, fontSize: 13, lineHeight: 17 }}>{day.shortLabel}</Text>
                          ))}
                        </View>
                      </>
                    );
                  })()}
                </View>
                <Pressable
                  testID="stats-rhythm-row"
                  accessibilityRole="button"
                  accessibilityLabel={`${coachMetrics.status}. ${coachMetrics.rhythmCaption}`}
                  onPress={() => { hapticTap(); scrollRef.current?.scrollTo({ y: Math.max(0, weekAnalyticsYRef.current), animated: true }); }}
                  style={({ pressed }) => [{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: statsGlass.plateFillFrom, boxShadow: plateBoxShadow(statsGlass) /* «Тень» 12.10: строка-плашка без кромки */ }, pressed && { opacity: 0.85 }]}
                >
                  <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: statsGlass.opaqueControl }}>
                    <Ionicons name="trending-up" size={20} color={statsGlass.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{coachMetrics.status}</Text>
                    <Text style={{ color: statsGlass.secondary, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{coachMetrics.rhythmCaption}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={statsGlass.secondary} />
                </Pressable>

                {/* зачем (§126/§137): одноразовое объяснение, как считается серия — сразу под самой серией. */}
                <StreakRuleExplainer lang={lang} />

                {/* зачем (владелец, 2026-09-13): обычному аккаунту свободны уровень, опыт,
                    серия и последние достижения — они идут первыми у всех, одна иерархия
                    для обычного и Plus. Пока достижений нет — раздел скрыт целиком. */}
                {achievementCount > 0 ? (
                <Reanimated.View entering={FadeInDown.duration(420).delay(210)}>
                <RecentAchievementsCard
                  t={t}
                  f={f}
                  lang={lang}
                  themeMode={themeMode}
                  isGoldTheme={isGoldTheme}
                  achievementCount={achievementCount}
                  recentIds={recentAchievementIds}
                  onPress={() => {
                    hapticTap();
                    router.push('/achievements_screen' as any);
                  }}
                />
                </Reanimated.View>
                ) : null}

                {/* Ниже — аналитика Plus. У обычного аккаунта каждый блок целиком под
                    существующим замком StatsPremiumBlur (lock + gold CTA), без PlusBadge
                    и без живых переключателей под частичной вуалью. */}
                {(isPremium || statsDevUnlock) ? (
                  <>
                    {weekAnalyticsBlock}
                    {allMetricsBlock}
                    {percentilesBlock}
                  </>
                ) : (
                  <View testID="stats-free-locked-analytics" style={{ gap: 12 }}>
                    {weekAnalyticsBlock}
                    {allMetricsBlock}
                    {percentilesBlock}
                  </View>
                )}



                {false && (<React.Fragment>
                {/* Историческая реализация сохранена в коде для обратной совместимости данных,
                    но отдельный «Весь путь» удалён с экрана по решению пользователя. */}
                <TouchableOpacity testID="legacy-stats-details-toggle" activeOpacity={0.84} onPress={() => {
                    hapticTap();
                    setDetailsOpen((v) => !v);
                }}>
                  <StatsCardArtSurface name="archiveMap" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} scrim="stats" style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? null : null]}>
                    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isGoldTheme ? GOLD_RICH.wash : accentTint(t.accent), alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="bar-chart-outline" size={22} color={isGoldTheme ? GOLD_RICH.champagne : t.accentText}/>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                        {triLang(lang, {
                    ru: 'Архив',
                    uk: 'Архів',
                    en: 'Archive',
                    es: 'Archivo',
                    'pt-BR': "Arquivo",
                    vi: "Lưu trữ",
                    id: "Arsip",
                    tr: "Arşiv",
                    pl: "Archiwum",
                })}
                      </Text>
                    </View>
                    <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={glassTone(t.textPrimary, 0.45)}/>
                  </StatsCardArtSurface>
                </TouchableOpacity>

                {detailsOpen && (<View testID="stats-details-expanded" style={{ gap: 12 }}>
                {/* График времени по дням — для !premium закрыт blur\'ом + lock CTA. */}
                <StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="stats" snapshotKey="pathChart" devUnlock={statsDevUnlock}>
                {(() => {
                        // У новичка график — простыня пустых столбиков; вместо неё честная заглушка.
                        if (allTimeDays.filter(d => d.ms > 0).length < 3) {
                            return (<StatsCardArtSurface name="archiveMap" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={16} scrim="stats" style={{ borderRadius: 16, padding: 20, alignItems: 'center' }}>
                            <Ionicons name="bar-chart-outline" size={24} color={t.textMuted}/>
                            <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', marginTop: 8, lineHeight: f.sub * 1.4 }}>
                              {triLang(lang, {
                                ru: 'График появится после пары дней практики',
                                uk: 'Графік з’явиться після кількох днів практики',
                                en: 'The chart will appear after a few days of practice',
                                es: 'El gráfico aparecerá tras un par de días de práctica',
                                'pt-BR': 'O gráfico aparece após alguns dias de prática',
                                vi: 'Biểu đồ sẽ hiện sau vài ngày luyện tập',
                                id: 'Grafik muncul setelah beberapa hari latihan',
                                tr: 'Grafik birkaç gün pratikten sonra görünecek',
                                pl: 'Wykres pojawi się po kilku dniach ćwiczeń',
                              })}
                            </Text>
                          </StatsCardArtSurface>);
                        }
                        const timeDaysChart = allTimeDays.length > 0
                            ? allTimeDays
                            : allDays.map(d => ({
                                date: d.date,
                                shortLabel: d.shortLabel,
                                dayNum: d.dayNum,
                                ms: 0,
                                active: false,
                            }));
                        const maxMs = Math.max(...timeDaysChart.map(d => d.ms), 1);
                        return (<StatsCardArtSurface name="archiveMap" theme={t} themeMode={themeMode} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={16} scrim="stats" style={{ borderRadius: 16, padding: 16, paddingBottom: 8, }}>
                      <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 12,
                                borderRadius: 12,
                                padding: 3,
                                backgroundColor: t.bgSurface,
                                }}>
                        <View style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 9,
                                alignItems: 'center',
                                backgroundColor: t.bgCard ?? t.bgSurface2,
                                boxShadow: nestedBoxShadow(statsGlass), // зачем («Тень» 12.10): активный сегмент — тон и малая тень вместо кромки 0.5
                            }}>
                          <Text style={{
                                color: t.textPrimary,
                                fontSize: f.body,
                                fontWeight: '700',
                            }}>
                            {triLang(lang, {
                                ru: 'Время',
                                uk: 'Час',
                                en: 'Time',
                                es: 'Tiempo',
                                'pt-BR': "Tempo",
                                vi: "Thời gian",
                                id: "Waktu",
                                tr: "Süre",
                                pl: "Czas",
                            })}
                          </Text>
                        </View>
                      </View>
                      <ScrollView ref={chartScrollRef} decelerationRate="fast" horizontal showsHorizontalScrollIndicator indicatorStyle="white" onLayout={() => chartScrollRef.current?.scrollToEnd?.({ animated: false })} contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 12 }}>
                        {timeDaysChart.map((d, i) => {
                                    const barH = d.ms > 0 ? Math.max((d.ms / maxMs) * CHART_H, 8) : 5;
                                    const isToday = d.date === today;
                                    const barColor = d.active
                                        ? (isToday ? t.textPrimary : accentGraphicOf(t))
                                        : (isToday ? t.border : t.bgSurface2 ?? t.border);
                                    const timeLabel = formatTimeBarMs(d.ms, lang);
                                    return (<View key={`t-${i}`} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                                  <View style={{ height: CHART_VALUE_LABEL_H, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                                    <AdaptiveLabel testID={`stats-lifetime-chart-value-time-${d.date}`} provenance="authored" availableWidth={26} compactLineLimit={1} style={{
                                            color: d.ms > 0 ? (isToday ? t.textPrimary : t.accentText) : t.textGhost,
                                            fontSize: 7, // d145-micro: подпись оси графика в колонке 26 pt, 13 не влезает
                                            fontWeight: '700',
                                            textAlign: 'center',
                                        }}>
                                      {timeLabel}
                                    </AdaptiveLabel>
                                  </View>
                                  <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                                    <View style={{
                                            width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                                            backgroundColor: barColor,
                                            opacity: d.active ? 1 : 0.35,
                                        }}/>
                                  </View>
                                  <AdaptiveLabel testID={`stats-lifetime-chart-day-time-${d.date}`} provenance="authored" availableWidth={26} compactLineLimit={1} style={{
                                            color: isToday ? t.textPrimary : t.textMuted,
                                            fontSize: 8, fontWeight: isToday ? '800' : '400', // d145-micro: подпись оси графика в колонке 26 pt, 13 не влезает
                                            lineHeight: 11,
                                        }}>{d.shortLabel}</AdaptiveLabel>
                                  <Text style={{ color: isToday ? t.accentText : t.textGhost, fontSize: 8 /* d145-micro: подпись оси графика в колонке 26 pt, 13 не влезает */ }}>{d.dayNum}</Text>
                                </View>);
                                })}
                      </ScrollView>
                    </StatsCardArtSurface>);
                    })()}
                </StatsPremiumBlur>

                {lifetimeStats != null && (<StatsPremiumBlur isPremium={isPremium} accessResolved={premiumAccessResolved} context="stats" snapshotKey="lifetimeTotals" devUnlock={statsDevUnlock}>
                    <LifetimeTotalsBlock t={{
                            bgCard: t.bgCard,
                            bgSurface: t.bgSurface,
                            border: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border,
                            textPrimary: t.textPrimary,
                            textSecond: t.textSecond,
                            textMuted: t.textMuted,
                            accent: accentGraphicOf(t), // зачем (светлый акцент): блок «за всё время» берёт accent как графику
                            accentText: t.accentText,
                        }} f={f} lang={lang} data={lifetimeStats!} expandedKind={expandedLifetimeKind} onToggleMetric={(kind) => {
                            if (!isPremium && !statsDevUnlock)
                                return;
                            setDevLifetimeAllCharts(false);
                            setLifetimePathChartsByKind({});
                            hapticTap();
                            setExpandedLifetimeKind((prev) => (prev === kind ? null : kind));
                        }} chartDays={lifetimeChartDays} chartLoading={lifetimeChartLoading} chartScrollRef={lifetimeChartScrollRef} showAllPathCharts={devLifetimeAllCharts} pathChartsByKind={lifetimePathChartsByKind} isGoldTheme={isGoldTheme} themeMode={themeMode}/>
                  </StatsPremiumBlur>)}
                {ENABLE_DEV_TOOLS && (<TouchableOpacity onPress={() => void randomizeLifetimeChartsForDev()} disabled={devLifetimeChartsBusy} activeOpacity={0.75} style={{
                            marginBottom: 12,
                            borderRadius: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            backgroundColor: 'rgba(255, 180, 60, 0.14)', // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
                            borderWidth: 0,
                            borderColor: 'rgba(255, 160, 40, 0.45)', // theme-exempt: семантические цвета оценки и динамики серии (токены good/warn — у «Тем»)
                        }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                      {triLang(lang, {
                            ru: devLifetimeChartsBusy ? 'Генерация…' : 'Dev: случайные графики «Весь путь» (7 дн.)',
                            uk: devLifetimeChartsBusy ? 'Генерація…' : 'Dev: випадкові графіки «Увесь шлях» (7 дн.)',
                            en: devLifetimeChartsBusy ? 'Generating…' : 'Dev: random "Lifetime" charts (7 d.)',
                            es: devLifetimeChartsBusy ? 'Generando…' : 'Dev: gráficas aleatorias «Todo el camino» (7 d.)',
                            'pt-BR': devLifetimeChartsBusy ? 'Gerando…' : 'Dev: gráficos aleatórios «Todo o caminho» (7 d.)',
                            vi: devLifetimeChartsBusy ? 'Đang tạo…' : 'Dev: biểu đồ ngẫu nhiên «Toàn bộ hành trình» (7 ngày)',
                            id: devLifetimeChartsBusy ? 'Membuat…' : 'Dev: grafik acak «Seluruh perjalanan» (7 h)',
                            tr: devLifetimeChartsBusy ? 'Oluşturuluyor…' : 'Dev: rastgele «Tüm yol» grafikleri (7 g.)',
                            pl: devLifetimeChartsBusy ? 'Generowanie…' : 'Dev: losowe wykresy «Cała droga» (7 d.)',
                        })}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center', lineHeight: f.sub * 1.35 }}>
                      {triLang(lang, {
                            ru: 'Случайные значения за 7 дней: все строки и графики под ними; цифры слева = сумма за эти 7 дней (дни цепочки/уровень — как в профиле).',
                            uk: 'Випадкові значення за 7 днів: усі рядки й графіки під ними; числа зліва = сума за ці 7 днів.',
                            en: 'Random 7-day values: all rows and charts below; the left number = the sum for those 7 days.',
                            es: 'Valores aleatorios 7 días: todas las filas y gráficos debajo; la columna izquierda = suma de esos 7 días.',
                            'pt-BR': "Valores aleatórios de 7 dias: todas as linhas e gráficos abaixo; a coluna esquerda = soma desses 7 dias.",
                            vi: "Giá trị ngẫu nhiên 7 ngày: tất cả hàng và biểu đồ bên dưới; cột trái = tổng của 7 ngày đó.",
                            id: "Nilai acak 7 hari: semua baris dan grafik di bawah; kolom kiri = jumlah 7 hari itu.",
                            tr: "7 günlük rastgele değerler: altındaki tüm satırlar ve grafikler; sol sütun = bu 7 günün toplamı.",
                            pl: "Losowe wartości 7 dni: wszystkie wiersze i wykresy poniżej; lewa kolumna = suma tych 7 dni.",
                        })}
                    </Text>
                  </TouchableOpacity>)}
                </View>)}
                </React.Fragment>)}

                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <ReportErrorButton screen="streak_stats" dataId="streak_stats_main" dataText={triLang(lang, {
                    ru: 'Цепочки и результаты',
                    uk: 'Стріки та результати',
                    en: 'Streaks and stats',
                    es: 'Rachas y estadísticas',
                    'pt-BR': "Sequências e estatísticas",
                    vi: "Chuỗi và thống kê",
                    id: "Rangkaian dan statistik",
                    tr: "Seriler ve istatistikler",
                    pl: "Serie i statystyki",
                })}/>
                </View>

                <View style={{ height: 8 }}/>
                </View>
              </Reanimated.ScrollView>
              </BouncyWrap>
              </Reanimated.View>
              </ContentWrap>

              {/* stationary_clubs feature удалён — модал описания клуба был мёртвым кодом
                  (clubDescVisible никогда не выставлялся в true) и удалён. */}


            </SafeAreaView>
        </View>
    );
}

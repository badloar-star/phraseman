import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Reanimated, { FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, cancelAnimation, Easing } from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { Animated, View, Text, ScrollView, Modal, Pressable, TouchableOpacity, Platform, Share, PanResponder, StyleSheet, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import ContentWrap from '../components/ContentWrap';
import { glassFill } from '../components/GlassSurface';
import StatsArtBackdrop from '../components/StatsArtBackdrop';
import StatsCardArtSurface from '../components/StatsCardArtSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { monoIcon, MONO_ICON, isBusinessMode } from '../constants/monoIcon';
import { streakCalendarShortWeekdays, streakChartScrubHint, streakWeeklyExperienceLabel, streakWeekRowShort, streakWagerTierDaysLabel, streakProtectionStatusLabel, } from '../constants/streak_stats_i18n';
import { LEAGUES } from './league_engine';
import { clearFinishedWager, getEffectiveWagerStake, loadWager, placeWager, wagerDaysLeft, WagerState, WAGER_TIERS } from './streak_wager';
// stationary_clubs feature удалён.
import { ENABLE_DEV_TOOLS, STORE_URL } from './config';
import { shouldDevUnlockStatsPremiumContent } from './stats_premium_access';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import StatsPremiumBlur from '../components/StatsPremiumBlur';
import ActivityHeatmap365 from '../components/ActivityHeatmap365';
import TodaysBoonStrip from '../components/TodaysBoonStrip';
import { StreakChainIcon } from '../components/StreakChainIcon';
import StreakReviveModal from '../components/StreakReviveModal';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { getShardsBalance, spendShards } from './shards_system';
import { updateTaskProgress } from './daily_tasks';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { getStatsCache, hydrateStatsCacheFromStorage, refreshStatsCache, type StatsCachedDay, type StatsCachedTimeDay, type StatsPreloadData, } from './statsCache';
import { emitAppEvent, onAppEvent } from './events';
import { oskolokImageForPackShards } from './oskolok';
import { loadActiveLeagueBoost } from './league_personal_boosts';
import { formatLeagueGroupBoostTimeLeft, getActiveLeagueGroupBoost } from './league_group_boosts';
import { syncDailyAnalyticsIfNeeded, loadPercentileData } from './daily_analytics_sync';
import { type AllPercentiles } from './leaderboard_stats';
import { loadLifetimeProfileStats, type LifetimeProfileStats } from './lifetime_profile_stats';
import { devRandomizeLifetimePathDailyMetrics, loadLifetimeTotalsChartDays, loadWeeklyLearnedCounts, type LifetimeTotalsChartKind, type LifetimeChartDay, type DevLifetimePathRandomSums, } from './stats_daily_breakdown';
import { ALL_ACHIEVEMENTS, achievementNameForLang, loadAchievementStates } from './achievements';
import { getTrainerDashboard } from './trainer_store';
import CefrLine from '../components/journal/CefrLine';
import SkeletonBlock from '../components/SkeletonShimmer';
import AchievementArt from '../components/AchievementArt';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { getLevelFromXP, isLightThemeMode, TOTAL_XP_FOR_LEVEL, type ThemeMode } from '../constants/theme';
import { statsAccent, statsBorder, statsGlowStyle, statsHairline, statsPageField, statsSoftBg, statsThemeAccent, statsThemeSoftBg } from '../constants/statsThemeChrome';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../constants/streakIconAssets';
import GoldBevel from '../components/GoldBevel';
import PlusBadge from '../components/PlusBadge';
import { FlowText } from '../components/text-integrity/FlowText';
import { AdaptiveLabel } from '../components/text-integrity/AdaptiveLabel';
import { buildStatsLearningInsights, type StatsLearningInsights } from './stats_learning_insights';
import { StatScoreRing } from '../components/stats/StatScoreRing';
import { StatBars, type StatBar } from '../components/stats/StatBars';
import { StatProgressRow } from '../components/stats/StatProgressRow';
import { StatCountUpText } from '../components/stats/StatCountUpText';
import { DEFAULT_STATS_PRIMARY_METRIC, normalizeStatsPrimaryMetric, recentUnlockedAchievementIds, type StatsPrimaryMetric } from './stats_primary_metric';
import { statsPrimaryMetricKey } from './target_storage_keys';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { navigateAfterModalClose } from './safe_modal_navigation';
import { loadPendingLevelGiftCount, readPendingLevelGiftCountCache } from './level_gift_inventory';
import { readLocalLevelSpinBalance } from './local_level_spins';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { shouldUsePracticeWarmup } from './streak_stats_practice_balance';
import { safeRouterBack } from './navigation_back';
import { visiblePercentile } from './stats_percentile_display';
import { getReviveOffer, type StreakReviveOffer } from './streak_revive';
import { doubleXpMultiplier, earlyBirdMultiplier } from './boons/boon_effects_xp';
import { noAndroidOutline } from '../constants/androidGlow';
const CHART_H = 110;
const DAYS_SHOW = 14;
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
function ruGiftPhrase(total: number): string {
    return total > 0 ? `${total} ${pluralRu(total, 'подарок', 'подарка', 'подарков')}` : 'Подарки';
}
function ukGiftPhrase(total: number): string {
    return total > 0 ? `${total} ${pluralRu(total, 'подарунок', 'подарунки', 'подарунків')}` : 'Подарунки';
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
    accent: string;
};
interface DayData {
    date: string;
    shortLabel: string;
    dayNum: string;
    points: number;
    active: boolean;
    streak: number;
}
/** Тот же диапазон дат, что и график опыта — время в приложении (foreground), мс. */
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
/** Очки (опыт) за день над столбцом «Полученный опыт за день» (значение из daily_stats). */
function formatActivityBarPoints(points: number, lang: Lang): string {
    const n = Math.max(0, Math.round(Number(points) || 0));
    if (n === 0)
        return triLang(lang, {
            ru: '0',
            uk: '0',
            es: '0',
            'pt-BR': "0",
            vi: "0",
            id: "0",
            tr: "0",
            pl: "0",
        });
    return String(n);
}
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
        'pt-BR': `${h}h${m}`,
        vi: `${h} giờ ${m} phút`,
        id: `${h} jam ${m} mnt`,
        tr: `${h} sa ${m} dk`,
        pl: `${h} godz. ${m} min`,
    });
}
function formatStatsBoostTimeLeft(ms: number, lang: Lang): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    // Единицы времени по языку — раньше «ч/м/с» кириллицей уезжали во все локали.
    const units = triLang(lang, {
        ru: ['ч', 'м', 'с'],
        uk: ['г', 'хв', 'с'],
        es: ['h', 'm', 's'],
        'pt-BR': ['h', 'm', 's'],
        vi: ['g', 'p', 's'],
        id: ['j', 'm', 'd'],
        tr: ['sa', 'dk', 'sn'],
        pl: ['g', 'm', 's'],
    }) as [string, string, string];
    return h > 0
        ? `${h}${units[0]} ${m.toString().padStart(2, '0')}${units[1]}`
        : `${m}${units[1]} ${s.toString().padStart(2, '0')}${units[2]}`;
}
type LearningRhythmDay = DayData & {
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
    xp7: number;
    minutes7: number;
    avgMinutesActive: number;
    totalStreak: number;
    todayXp: number;
    todayMinutes: number;
    bestDayLabel: string;
    weakDayLabel: string;
    rhythmSummary: string;
    actionTitle: string;
    actionBody: string;
    actionCta: string;
    scoreColor: string;
    rhythmDays: LearningRhythmDay[];
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
        'pt-BR': `${h} h ${m} min`,
        vi: `${h} giờ ${m} phút`,
        id: `${h} jam ${m} mnt`,
        tr: `${h} sa ${m} dk`,
        pl: `${h} godz. ${m} min`,
    });
}
function buildLearningCoachMetrics(dayRows: DayData[], timeRows: TimeDayData[], totalStreak: number, lang: Lang): LearningCoachMetrics {
    const todayStr = toDateStr(new Date());
    const timeByDate = new Map(timeRows.map((d) => [d.date, d]));
    const sourceDays = dayRows.length > 0 ? dayRows : getLast14().map((date) => {
        const d = new Date(`${date}T12:00:00`);
        return {
            date,
            shortLabel: streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY)[d.getDay()],
            dayNum: String(d.getDate()),
            points: 0,
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
            weekDates.push(toDateStr(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
    }
    const rhythmDays: LearningRhythmDay[] = weekDates.map((date) => {
        const known = dayByDate.get(date);
        const cal = new Date(`${date}T12:00:00`);
        const points = known?.points ?? 0;
        const minutes = minutesFromMs(timeByDate.get(date)?.ms ?? 0);
        const active = (known?.active ?? false) || points > 0 || minutes > 0;
        return {
            date,
            shortLabel: known?.shortLabel ?? weekWdays[cal.getDay()],
            dayNum: known?.dayNum ?? String(cal.getDate()),
            streak: known?.streak ?? 0,
            points,
            active,
            minutes,
            combined: points + minutes * 6,
            isToday: date === todayStr,
        };
    });
    const active7 = rhythmDays.filter((d) => d.active).length;
    const xp7 = rhythmDays.reduce((sum, d) => sum + d.points, 0);
    const minutes7 = rhythmDays.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutesActive = active7 > 0 ? Math.round(minutes7 / active7) : 0;
    const todayRow = rhythmDays.find((d) => d.isToday) ?? rhythmDays[rhythmDays.length - 1];
    const todayXp = todayRow?.points ?? 0;
    const todayMinutes = todayRow?.minutes ?? 0;
    const ranked = [...rhythmDays].sort((a, b) => b.combined - a.combined);
    const bestDay = ranked[0];
    const weakDay = [...rhythmDays].sort((a, b) => a.combined - b.combined)[0];
    const regularityPart = clampNumber(active7 / 5, 0, 1) * 45;
    // От недельного объёма (цель ~60 мин/нед), а не от среднего за активный день:
    // раньше один длинный день давал полный балл «длины занятий» и оценка льстила.
    const focusPart = clampNumber(minutes7 / 60, 0, 1) * 25;
    const streakPart = clampNumber(totalStreak / 14, 0, 1) * 20;
    const volumePart = clampNumber(xp7 / 180, 0, 1) * 10;
    const score = Math.round(regularityPart + focusPart + streakPart + volumePart);
    const isWarmup = shouldUsePracticeWarmup({ active7, totalStreak, xp7, minutes7 });
    let scoreLabel = String(score);
    let scoreSubLabel = '/100';
    let scoreColor = score >= 76 ? '#35D07F' : score >= 50 ? '#FFB020' : '#FF6B6B';
    let status = score >= 76
        ? triLang(lang, {
            ru: 'Стабильный ритм',
            uk: 'Стабільний ритм',
            es: 'Ritmo estable',
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
            'pt-BR': "d.",
            vi: "ngày",
            id: "h",
            tr: "g.",
            pl: "d.",
        });
        scoreColor = '#4F8FF7';
        status = triLang(lang, {
            ru: 'Начало положено',
            uk: 'Гарний старт',
            es: 'Ya estás en marcha',
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
        'pt-BR': "Começar 5 min",
        vi: "Bắt đầu 5 phút",
        id: "Mulai 5 mnt",
        tr: "5 dk başlat",
        pl: "Zacznij 5 min",
    });
    if (isWarmup) {
        const warmupHasToday = todayXp > 0 || todayMinutes > 0;
        actionTitle = triLang(lang, {
            ru: 'Отличный старт',
            uk: 'Чудовий старт',
            es: 'Buen comienzo',
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
            'pt-BR': "Abrir prática",
            vi: "Mở luyện tập",
            id: "Buka latihan",
            tr: "Pratiği aç",
            pl: "Otwórz ćwiczenie",
        });
    }
    else if (todayXp > 0 || todayMinutes > 0) {
        actionTitle = triLang(lang, {
            ru: 'Закрепи день тренировкой',
            uk: 'Закріпи день тренуванням',
            es: 'Cierra el día con práctica',
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
            'pt-BR': "A semana está indo bem. Uma sessão pequena basta para manter a estabilidade.",
            vi: "Tuần này đang ổn. Một buổi ngắn là đủ để giữ sự ổn định.",
            id: "Minggu ini berjalan baik. Sesi kecil cukup untuk menjaga stabilitas.",
            tr: "Hafta iyi gidiyor. İstikrarı korumak için küçük bir seans yeter.",
            pl: "Tydzień idzie dobrze. Mała sesja wystarczy, żeby utrzymać stabilność.",
        });
    }
    return {
        score,
        scoreLabel,
        scoreSubLabel,
        status,
        scoreHint,
        isWarmup,
        active7,
        xp7,
        minutes7,
        avgMinutesActive,
        totalStreak,
        todayXp,
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
      <ScrollView ref={scrollRef ?? undefined} decelerationRate="normal" horizontal showsHorizontalScrollIndicator onLayout={() => scrollRef?.current?.scrollTo?.({ x: 0, y: 0, animated: false })}>
        <View>
          <Svg width={chartW} height={LIFETIME_LINE_PLOT_H}>
            {[0, 1, 2, 3, 4].map((g) => {
            const plotBottom = LIFETIME_LINE_PLOT_H - 4;
            const plotTop = 8;
            const y = plotTop + ((plotBottom - plotTop) * g) / 4;
            return (<Line key={`g-${g}`} x1={0} y1={y} x2={chartW} y2={y} stroke={ct.border} strokeWidth={1}/>);
        })}
            {!hasDailyData ? (<Circle cx={startDotCx} cy={yZero} r={4.5} fill={ct.accent}/>) : chartLen === 1 && raw[0] > 0 ? (<Circle cx={LIFETIME_LINE_COL_W / 2} cy={lifetimeChartYForValue(raw[0], maxV, LIFETIME_LINE_PLOT_H)} r={5} fill={ct.accent}/>) : (<>
                {pointsPink.length > 0 ? (<Polyline points={pointsPink} fill="none" stroke={ct.accent} strokeOpacity={0.38} strokeWidth={2.25}/>) : null}
                {pointsRed.length > 0 ? (<Polyline points={pointsRed} fill="none" stroke={ct.accent} strokeWidth={2.75}/>) : null}
              </>)}
          </Svg>
          <View style={{ flexDirection: 'row', gap: LIFETIME_LINE_GAP, marginTop: 8 }}>
            {visibleDays.map((d, i) => {
            const isToday = d.date === chartToday;
            const isFuture = d.date > chartToday;
            return (<View key={`ltx-${i}`} style={{ width: LIFETIME_LINE_COL_W, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 8,
                    fontWeight: isToday ? '800' : '500',
                    color: isToday ? ct.accent : ct.textMuted,
                    opacity: isFuture ? 0.45 : 1,
                }} numberOfLines={1}>
                    {d.shortLabel}
                  </Text>
                  <Text style={{
                    fontSize: 8,
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
                borderBottomWidth: 0.5,
                borderBottomColor: t.border,
                gap: 8,
            }}>
            <Text style={{ color: t.accent, fontSize: f.body, flex: 1, fontWeight: '600' }} numberOfLines={2}>
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
                    'pt-BR': "Por dia: semana atual e próxima",
                    vi: "Theo ngày: tuần này và tuần tới",
                    id: "Per hari: minggu ini dan berikutnya",
                    tr: "Günlere göre: bu hafta ve gelecek hafta",
                    pl: "Dniami: obecny i następny tydzień",
                })}
            </Text>
            <LifetimePathLineChart days={daysForChart} loading={loadingForChart} scrollRef={teaserOk || (showAllPathCharts && !!multiSeries?.length) ? undefined : chartScrollRef} plotFutureDays={!!showAllPathCharts} showSmoothedLine={!showAllPathCharts} chartTheme={{
                    bgSurface: t.bgSurface,
                    border: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap'),
                    textPrimary: t.textPrimary,
                    textSecond: t.textSecond,
                    textMuted: t.textMuted,
                    accent: t.accent,
                }}/>
          </>) : null}
      </React.Fragment>);
    };
    type LifetimeRow = { label: string; numValue: number; kind: LifetimeTotalsChartKind };
    const lifetimeRows: LifetimeRow[] = [
        { kind: 'words_learned', numValue: data.wordsLearned, label: triLang(lang, { ru: 'Слов выучено', uk: 'Слів вивчено', es: 'Palabras aprendidas', 'pt-BR': 'Palavras aprendidas', vi: 'Từ đã học', id: 'Kata dipelajari', tr: 'Öğrenilen kelimeler', pl: 'Nauczone słowa' }) },
        { kind: 'phrases_learned', numValue: data.phrasesLearned, label: triLang(lang, { ru: 'Фраз выучено', uk: 'Фраз вивчено', es: 'Frases aprendidas', 'pt-BR': 'Frases aprendidas', vi: 'Cụm từ đã học', id: 'Frasa dipelajari', tr: 'Öğrenilen ifadeler', pl: 'Nauczone zwroty' }) },
        { kind: 'flashcards_saved', numValue: data.flashcardsSaved, label: triLang(lang, { ru: 'Карточек сохранено', uk: 'Карток збережено', es: 'Tarjetas guardadas', 'pt-BR': 'Cartões salvos', vi: 'Thẻ đã lưu', id: 'Kartu disimpan', tr: 'Kaydedilen kartlar', pl: 'Zapisane fiszki' }) },
        { kind: 'daily_tasks_claimed', numValue: data.dailyTasksClaimed, label: triLang(lang, { ru: 'Заданий дня выполнено', uk: 'Завдань дня виконано', es: 'Misiones diarias hechas', 'pt-BR': 'Missões diárias feitas', vi: 'Nhiệm vụ hằng ngày đã làm', id: 'Misi harian selesai', tr: 'Tamamlanan günlük görevler', pl: 'Wykonane misje dzienne' }) },
        { kind: 'shards_earned', numValue: data.shardsEarned, label: triLang(lang, { ru: 'Жемчуга заработано', uk: 'Перлин зароблено', es: 'Perlas ganadas', 'pt-BR': 'Pérolas ganhas', vi: 'Ngọc trai đã kiếm', id: 'Mutiara diperoleh', tr: 'Kazanılan inciler', pl: 'Zdobyte perły' }) },
        { kind: 'shards_spent', numValue: data.shardsSpent, label: triLang(lang, { ru: 'Жемчуга потрачено', uk: 'Перлин витрачено', es: 'Perlas gastadas', 'pt-BR': 'Pérolas gastas', vi: 'Ngọc trai đã dùng', id: 'Mutiara dipakai', tr: 'Harcanan inciler', pl: 'Wydane perły' }) },
    ];
    // В dev/teaser-режимах (gateExpandAll / showAllPathCharts) показываем все строки
    // без сворачивания, иначе прячем нулевые под раскрывашку, чтобы у новичка
    // не было простыни нулей.
    const collapseZeros = !gateExpandAll && !showAllPathCharts;
    const zeroRows = collapseZeros ? lifetimeRows.filter((r) => r.numValue <= 0) : [];
    const [zeroRowsExpanded, setZeroRowsExpanded] = React.useState(false);
    return (<StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={[t.bgCard, t.bgCard, t.bgSurface]} radius={18} scrim="stats" style={{
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            borderWidth: 0,
            borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap'),
        }}>
      <Text style={{
            color: isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'archiveMap'),
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
            'pt-BR': "Total histórico",
            vi: "Tổng từ trước đến nay",
            id: "Total historis",
            tr: "Tüm zamanlar toplamı",
            pl: "Suma historyczna",
        })}
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
    'daily_tasks_claimed',
    'shards_earned',
    'shards_spent',
];
function mergeDevRandomSumsIntoLifetime(base: LifetimeProfileStats, sums: DevLifetimePathRandomSums): LifetimeProfileStats {
    return {
        ...base,
        wordsLearned: sums.wordsLearned,
        flashcardsSaved: sums.flashcardsSaved,
        phrasesLearned: sums.phrasesLearned,
        dailyTasksClaimed: sums.dailyTasksClaimed,
        shardsEarned: sums.shardsEarned,
        shardsSpent: sums.shardsSpent,
    };
}
// ── Пари на цепочку ───────────────────────────────────────────────────────────
const TIER_ICONS_WAGER: any[] = ['flag-outline', 'flame-outline', 'thunderstorm-outline', 'trophy-outline', 'star-outline', 'diamond-outline'];
// ── Inline shard icon + amount helper ────────────────────────────────────────
function ShardsInline({ n, size = 14, textColor }: {
    n: number | string;
    size?: number;
    textColor?: string;
}) {
    const nNum = typeof n === 'number' ? n : parseInt(String(n), 10);
    const src = oskolokImageForPackShards(Number.isFinite(nNum) && nNum > 0 ? nNum : 0);
    return (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: textColor ?? '#E9D5FF', fontSize: size, fontWeight: '700', lineHeight: size * 1.35 }}>{n}</Text>
      <Image source={src} style={{ width: size + 2, height: size + 2 }} contentFit="contain"/>
    </View>);
}
/** B7: тёплая память Wager-блока на процесс — иначе стейт сбрасывается на каждом
 * ремаунте экрана, блок уходит в `return null` и «выпрыгивает» после загрузки. */
let wagerCardWarm: {
    wager: WagerState | null;
    shards: number;
    stakes: number[];
} | null = null;
/** зачем: achievementCount раньше стартовал с useState(0) и рисовал «Все 0»,
 * пока loadAchievementStates() (AsyncStorage) не отвечал в useFocusEffect —
 * тот же класс бага, что и wagerCardWarm выше. Модульный peek запоминает
 * последнее известное значение между открытиями экрана в рамках сессии
 * приложения, так что повторные визиты сразу показывают верное число. */
let achievementCountPeek: number | null = null;
let recentAchievementIdsPeek: string[] | null = null;

/** зачем: тот же peek-паттерн для «Прочность памяти»/CEFR-строки (MemoryGauge,
 * CefrLine) — totalTracked/masteredCount/dueToday читаются из локального
 * trainer_store (AsyncStorage, без сети) в useFocusEffect ниже; peek не даёт
 * модулям стартовать с нулей на повторных открытиях экрана в этой сессии. */
interface JournalMemorySnapshot {
    totalTracked: number;
    masteredCount: number;
    masteredPhraseCount: number;
    dueToday: number;
}
let journalMemorySnapshotPeek: JournalMemorySnapshot | null = null;

/** зачем: тот же peek-паттерн для вкладки «Активность за год» (Время/Опыт/Год) —
 * primaryMetric раньше стартовал с useState(DEFAULT_STATS_PRIMARY_METRIC) и
 * секцию AsyncStorage.getItem() в useEffect подменял значение чуть позже,
 * из-за чего при каждом повторном открытии экрана в этой же сессии был виден
 * мигающий переброс вкладки (напр. Опыт → Год). Модульный peek запоминает
 * последнее известное/выбранное значение синхронно, так что lazy-инициализатор
 * useState читает его на первом же кадре — без вспышки. Холодный старт
 * процесса (самый первый заход) неизбежно ждёт первого async-чтения один раз. */
let primaryMetricPeek: StatsPrimaryMetric | null = null;

function WagerCard({ lang, t, f, totalStreak, isGoldTheme, themeMode, hideCta = false, pickerOnly = false, onPickerClose }: {
    lang: Lang;
    t: any;
    f: any;
    totalStreak: number;
    isGoldTheme?: boolean;
    themeMode: ThemeMode;
    /** Скрыть CTA «принять пари» (новичок без серии); активное пари и результат показываются всегда. */
    hideCta?: boolean;
    /**
     * Режим «только пикер»: CTA-карточка не рендерится — только модал выбора
     * ставки и связанные подтверждения. «Пари на серию» из hero открывает
     * размещение ставки сразу, без промежуточных экранов.
     */
    pickerOnly?: boolean;
    /** pickerOnly: пикер и все подтверждения закрыты — родитель может размонтировать. */
    onPickerClose?: () => void;
}) {
    const router = useRouter();
    const insets = useStableSafeAreaInsets();
    const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
    const [wager, setWager] = useState<WagerState | null>(() => wagerCardWarm?.wager ?? null);
    const [loading, setLoading] = useState(() => wagerCardWarm == null);
    // pickerOnly: компонент монтируется уже с открытым пикером (hero «Пари на серию»).
    const [modalOpen, setModalOpen] = useState(() => pickerOnly);
    const [placing, setPlacing] = useState(false);
    const [selectedTier, setSelectedTier] = useState(0);
    const [shardsWager, setShardsWager] = useState(() => wagerCardWarm?.shards ?? 0);
    const [effectiveWagerStakes, setEffectiveWagerStakes] = useState<number[]>(
        () => wagerCardWarm?.stakes ?? WAGER_TIERS.map(tier => tier.betShards),
    );
    const [wagerNeedShards, setWagerNeedShards] = useState(false);
    const [wagerConfirm, setWagerConfirm] = useState(false);
    const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
    const wagerSheetY = useRef(new Animated.Value(0)).current;
    const reload = useCallback(async () => {
        const [w, shardsRaw, effectiveStakes] = await Promise.all([
            loadWager(),
            getShardsBalance(),
            Promise.all(WAGER_TIERS.map((_, idx) => getEffectiveWagerStake(idx).then(s => s.stakeToSpend))),
        ]);
        wagerCardWarm = { wager: w, shards: shardsRaw, stakes: effectiveStakes };
        setWager(w);
        setShardsWager(shardsRaw);
        setEffectiveWagerStakes(effectiveStakes);
        setLoading(false);
    }, []);
    useEffect(() => { void reload(); }, [reload]);
    useFocusEffect(useCallback(() => {
        void reload();
        return undefined;
    }, [reload]));
    useEffect(() => {
        const subShards = onAppEvent('shards_balance_updated', (payload) => {
            if (wagerCardWarm) wagerCardWarm = { ...wagerCardWarm, shards: payload.balance };
            setShardsWager(payload.balance);
        });
        const subPremiumOn = onAppEvent('premium_activated', () => {
            void reload();
        });
        const subPremiumOff = onAppEvent('premium_deactivated', () => {
            void reload();
        });
        const subWagerLost = onAppEvent('wager_lost', () => {
            void reload();
        });
        return () => {
            subShards.remove();
            subPremiumOn.remove();
            subPremiumOff.remove();
            subWagerLost.remove();
        };
    }, [reload]);
    const clampTierIdx = (i: number) => Math.max(0, Math.min(i, WAGER_TIERS.length - 1));
    // pickerOnly: когда закрыты и пикер, и подтверждения — сообщаем родителю,
    // чтобы он размонтировал компонент. Смотрим на все три состояния, иначе
    // подтверждение/магазин схлопнулись бы вместе с пикером.
    useEffect(() => {
        if (pickerOnly && !loading && !modalOpen && !wagerNeedShards && !wagerConfirm) {
            onPickerClose?.();
        }
    }, [pickerOnly, loading, modalOpen, wagerNeedShards, wagerConfirm, onPickerClose]);
    const closeWagerModal = useCallback(() => {
        setModalOpen(false);
        wagerSheetY.setValue(0);
    }, [wagerSheetY]);
    const wagerPanResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => (
            gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
        ),
        onPanResponderMove: (_evt, gesture) => {
            wagerSheetY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_evt, gesture) => {
            if (gesture.dy > 70 || gesture.vy > 0.85) {
                Animated.timing(wagerSheetY, {
                    toValue: 420,
                    duration: 160,
                    useNativeDriver: true,
                }).start(closeWagerModal);
                return;
            }
            Animated.spring(wagerSheetY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 180,
                friction: 22,
            }).start();
        },
        onPanResponderTerminate: () => {
            Animated.spring(wagerSheetY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 180,
                friction: 22,
            }).start();
        },
    }), [closeWagerModal, wagerSheetY]);
    const handlePlace = () => {
        const tier = WAGER_TIERS[clampTierIdx(selectedTier)];
        if (!tier)
            return;
        const stakeToSpend = effectiveWagerStakes[clampTierIdx(selectedTier)] ?? tier.betShards;
        if (shardsWager < stakeToSpend) {
            closeWagerModal();
            setWagerNeedShards(true);
            return;
        }
        closeWagerModal();
        setWagerConfirm(true);
    };
    const doPlace = async () => {
        setPlacing(true);
        const ok = await placeWager(totalStreak, clampTierIdx(selectedTier));
        if (ok) {
            await reload();
            closeWagerModal();
        }
        setPlacing(false);
    };
    if (loading)
        return null;
    // ── Результат ──────────────────────────────────────────────────────────────
    const wagerAccent = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'wager');
    const wagerBorder = isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'wager', 'medium');
    const wagerSoftBg = isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'wager');
    const dayDotAccent = isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode);
    const dayDotSoftBg = isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet');
    if (wager && !wager.active && wager.result !== 'pending') {
        const won = wager.result === 'won';
        const resultColor = won ? '#34C759' : '#FF3B30';
        return (<StatsCardArtSurface name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={16} scrim="stats" testID="wager-result-card" style={[{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0, borderColor: wagerBorder }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: resultColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={won ? 'trophy' : 'close-circle'} size={22} color={monoIcon(themeMode, resultColor, won ? MONO_ICON.light : MONO_ICON.muted)}/>
        </View>
        <View style={{ flex: 1 }}>
          {won ? (<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                    ru: 'Пари выиграно!',
                    uk: 'Парі виграно!',
                    es: '¡Apuesta ganada!',
                    'pt-BR': "Aposta vencida!",
                    vi: "Thắng cược!",
                    id: "Taruhan menang!",
                    tr: "Bahis kazanıldı!",
                    pl: "Zakład wygrany!",
                })}
              </Text>
              {/* §7: монетный выигрыш = 0 — строку с монетами показываем только если она ненулевая (легаси-пари). */}
              {wager.rewardShards > 0 ? (
              <ShardsInline n={`+${wager.rewardShards}`} size={f.body} textColor={resultColor}/>
              ) : null}
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                    ru: `+${wager.rewardXP} к опыту`,
                    uk: `+${wager.rewardXP} до досвіду`,
                    es: `+${wager.rewardXP} de XP`,
                    'pt-BR': `+${wager.rewardXP} de XP`,
                    vi: `+${wager.rewardXP} XP`,
                    id: `+${wager.rewardXP} XP`,
                    tr: `+${wager.rewardXP} XP`,
                    pl: `+${wager.rewardXP} XP`,
                })}
              </Text>
            </View>) : (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                    ru: 'Пари проиграно · −',
                    uk: 'Парі програно · −',
                    es: 'Racha perdida · −',
                    'pt-BR': "Sequência perdida · −",
                    vi: "Mất chuỗi · −",
                    id: "Rangkaian hilang · −",
                    tr: "Seri kaybedildi · −",
                    pl: "Seria utracona · −",
                })}
              </Text>
              <ShardsInline n={wager.betShards} size={f.body} textColor={resultColor}/>
            </View>)}
          <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
            {triLang(lang, {
                ru: 'Принять новое пари?',
                uk: 'Прийняти нове парі?',
                es: '¿Empezar otra apuesta?',
                'pt-BR': "Começar outra aposta?",
                vi: "Bắt đầu cược khác?",
                id: "Mulai taruhan lain?",
                tr: "Başka bahis başlatılsın mı?",
                pl: "Zacząć kolejny zakład?",
            })}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} testID="wager-result-new" onPress={() => {
                // Стираем завершённое пари из storage — иначе карточка результата
                // воскресала при каждом фокусе экрана (reload() читал старый ключ).
                void clearFinishedWager();
                setWager(null);
            }} style={{ backgroundColor: t.bgSurface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang, {
                ru: 'Да',
                uk: 'Так',
                es: 'Sí',
                'pt-BR': "Sim",
                vi: "Có",
                id: "Ya",
                tr: "Evet",
                pl: "Tak",
            })}
          </Text>
        </TouchableOpacity>
      </StatsCardArtSurface>);
    }
    // ── Активное пари ──────────────────────────────────────────────────────────
    if (wager?.active) {
        const daysLeft = wagerDaysLeft(wager);
        const daysKept = wager.daysRequired - daysLeft;
        const tierIcon = TIER_ICONS_WAGER[wager.tierIdx] ?? 'flame-outline';
        const progressPct = Math.max(0, Math.min(100, Math.round((daysKept / wager.daysRequired) * 100)));
        return (<StatsCardArtSurface name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={18} scrim="stats" testID="wager-active-card" style={[{ borderRadius: 18, padding: 14, borderWidth: 1, borderColor: wagerBorder, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: wagerSoftBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tierIcon} size={20} color={wagerAccent}/>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Пари активно',
                uk: 'Парі активне',
                es: 'Apuesta activa',
                'pt-BR': "Aposta ativa",
                vi: "Cược đang hoạt động",
                id: "Taruhan aktif",
                tr: "Aktif bahis",
                pl: "Aktywny zakład",
            })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <ShardsInline n={wager.betShards} size={f.label} textColor={wagerAccent}/>
            </View>
          </View>
          {wager.rewardShards > 0 ? (
          <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: 104 }}>
            <Text style={{ color: wagerAccent, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.35 }}>{wager.rewardShards}</Text>
          </View>
          ) : null}
        </View>

        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Прогресс',
                uk: 'Прогрес',
                es: 'Progreso',
                'pt-BR': "Progresso",
                vi: "Tiến độ",
                id: "Progres",
                tr: "İlerleme",
                pl: "Postęp",
            })}
            </Text>
            <Text style={{ color: wagerAccent, fontSize: f.label, fontWeight: '900' }}>
              {progressPct}%
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: t.bgSurface2, overflow: 'hidden' }}>
            <LinearGradient colors={[wagerAccent, statsAccent(themeMode, 'practiceBalance')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? 10 : 0, height: '100%', borderRadius: 999 }}/>
          </View>
        </View>

        {/* Day dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: wager.daysRequired }, (_, i) => {
                const done = i < daysKept;
                const cur = i === daysKept;
                return (<View key={i} style={{ flex: 1, height: 6, borderRadius: 3,
                        backgroundColor: done ? dayDotAccent : cur ? statsBorder(themeMode, 'wager', 'soft') : dayDotSoftBg }}/>);
            })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {/* §7: блок чистого выигрыша в монетах скрыт — выплата = 0; остаётся XP. */}
          <View style={{ flex: 1, minWidth: 0, backgroundColor: t.bgSurface2, borderRadius: 12, padding: 10 }}>
            <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>
              {triLang(lang, {
                ru: 'ОПЫТ',
                uk: 'ДОСВІД',
                es: 'XP',
                'pt-BR': "XP",
                vi: "XP",
                id: "XP",
                tr: "XP",
                pl: "XP",
            })}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>+{wager.rewardXP}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => {
                hapticTap();
                setWagerInfoOpen(v => !v);
            }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: statsSoftBg(themeMode, 'wager', 'quiet') }}>
          <Ionicons name="information-circle-outline" size={18} color={wagerAccent}/>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }}>
            {triLang(lang, {
                ru: wagerInfoOpen ? 'Скрыть правила пари' : 'Открыть правила и награды',
                uk: wagerInfoOpen ? 'Сховати правила парі' : 'Відкрити правила й нагороди',
                es: wagerInfoOpen ? 'Ocultar reglas' : 'Ver reglas y premios',
                'pt-BR': wagerInfoOpen ? 'Ocultar regras' : 'Ver regras e prêmios',
                vi: wagerInfoOpen ? 'Ẩn luật' : 'Xem luật và thưởng',
                id: wagerInfoOpen ? 'Sembunyikan aturan' : 'Lihat aturan dan hadiah',
                tr: wagerInfoOpen ? 'Kuralları gizle' : 'Kuralları ve ödülleri gör',
                pl: wagerInfoOpen ? 'Ukryj zasady' : 'Zobacz zasady i nagrody',
            })}
          </Text>
          <Ionicons name={wagerInfoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textGhost}/>
        </TouchableOpacity>
        {wagerInfoOpen ? (<View style={{ marginTop: 8, borderRadius: 12, borderWidth: 0, borderColor: statsHairline(themeMode, 'wager'), padding: 10 }}>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) }}>
              {triLang(lang, {
                    ru: 'Заходи и удерживай цепочку каждый день до конца срока. Если серия не сорвется, ставка вернется вместе с призом и опытом.',
                    uk: 'Заходь і тримай ланцюжок щодня до кінця строку. Якщо серія не зірветься, ставка повернеться разом із призом і досвідом.',
                    es: "Entra y conserva la racha cada día hasta el final. Si no se rompe, recuperas la apuesta con premio y XP.",
                    'pt-BR': "Entre e mantenha a sequência todos os dias até o fim. Se ela não quebrar, você recupera a aposta com prêmio e XP.",
                    vi: "Vào app và giữ chuỗi mỗi ngày cho đến hết hạn. Nếu không bị đứt, bạn nhận lại tiền cược kèm thưởng và XP.",
                    id: "Masuk dan jaga rangkaian setiap hari sampai akhir. Jika tidak putus, taruhan kembali bersama hadiah dan XP.",
                    tr: "Gir ve süre bitene kadar seriyi her gün koru. Seri bozulmazsa bahsi ödül ve XP ile geri alırsın.",
                    pl: "Wchodź i utrzymuj serię codziennie do końca. Jeśli się nie przerwie, odzyskasz zakład z nagrodą i XP.",
                })}
            </Text>
          </View>) : null}
      </StatsCardArtSurface>);
    }
    // ── Кнопка → открывает модал ────────────────────────────────────────────────
    if (hideCta && !pickerOnly)
        return null;
    const sel = WAGER_TIERS[clampTierIdx(selectedTier)];
    const effectiveBetShards = effectiveWagerStakes[clampTierIdx(selectedTier)] ?? sel.betShards;
    const canAfford = shardsWager >= effectiveBetShards;
    // Модалы выбора ставки и подтверждений — общие для CTA- и pickerOnly-режимов.
    const pickerModals = (<>
      {/* Модал выбора ставки */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeWagerModal}>
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}>
          <Pressable style={{ ...StyleSheet.absoluteFillObject }} onPress={closeWagerModal} />
          <Animated.View
            testID="wager-modal"
            style={{
                backgroundColor: t.bgPrimary,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                borderColor: wagerBorder,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 0,
                maxHeight: '92%',
                overflow: 'hidden',
                transform: [{ translateY: wagerSheetY }],
            }}
          >

              {/* Handle */}
              <View
                {...wagerPanResponder.panHandlers}
                hitSlop={{ top: 14, bottom: 14, left: 80, right: 80 }}
                style={{ alignSelf: 'center', paddingHorizontal: 28, paddingTop: 2, paddingBottom: 16 }}
              >
                <View style={{ width: 42, height: 5, backgroundColor: statsHairline(themeMode, 'wager'), borderRadius: 3 }}/>
              </View>

              <ScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomInset + 36 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', flex: 1 }}>
                  {triLang(lang, {
            ru: 'Пари на цепочку',
            uk: 'Парі на ланцюжок',
            es: 'Apuesta por la racha',
            'pt-BR': "Aposta pela sequência",
            vi: "Cược cho chuỗi",
            id: "Taruhan rangkaian",
            tr: "Seri bahsi",
            pl: "Zakład o serię",
        })}
                </Text>
                {/* Shard balance chip */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.bgSurface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0, borderColor: statsHairline(themeMode, 'wager') }}>
                  <Image source={oskolokImageForPackShards(typeof shardsWager === 'number' ? shardsWager : 0)} style={{ width: 16, height: 16 }} contentFit="contain"/>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{shardsWager}</Text>
                </View>
                <TouchableOpacity
                  testID="wager-close"
                  onPress={closeWagerModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.75}
                  style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface, borderWidth: 0, borderColor: statsHairline(themeMode, 'wager') }}
                >
                  <Ionicons name="close" size={20} color={t.textMuted}/>
                </TouchableOpacity>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 14, lineHeight: 20 }}>
                {triLang(lang, {
            ru: 'Выбери срок и сделай ставку жемчугом. Удержишь цепочку — заберёшь опыт.',
            uk: 'Обери строк і зроби ставку перлинами. Утримаєш ланцюжок — забереш досвід.',
            es: 'Elige un plazo y aporta perlas. Si mantienes la racha, ganas XP.',
            'pt-BR': "Escolha um prazo e aposte pérolas. Se mantiver a sequência, você ganha XP.",
            vi: "Chọn thời hạn và đặt ngọc trai. Nếu giữ chuỗi, bạn nhận XP.",
            id: "Pilih durasi dan setorkan fragmen. Jika rangkaian terjaga, kamu mendapat fragmen neto dan XP.",
            tr: "Bir süre seç ve inci yatır. Seriyi korursan XP kazanırsın.",
            pl: "Wybierz czas i wpłać monety. Jeśli utrzymasz serię, zyskasz monety netto i XP.",
        })}
              </Text>

              {/* Твой вызов */}
              <View style={{ borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: glassFill(t.bgSurface, 0.46) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: statsSoftBg(themeMode, 'wager', 'strong'), alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={TIER_ICONS_WAGER[clampTierIdx(selectedTier)]} size={17} color={wagerAccent}/>
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>
                    {triLang(lang, {
            ru: 'Твой вызов',
            uk: 'Твій виклик',
            es: 'Tu reto',
            'pt-BR': "Seu desafio",
            vi: "Thử thách của bạn",
            id: "Tantanganmu",
            tr: "Meydan okuman",
            pl: "Twoje wyzwanie",
        })}
                  </Text>
                  <Text style={{ color: wagerAccent, fontSize: f.sub, fontWeight: '900' }}>+{sel.rewardXP} XP</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                    <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {triLang(lang, {
            ru: 'Ставишь',
            uk: 'Ставиш',
            es: 'Aportas',
            'pt-BR': "Você aposta",
            vi: "Bạn đặt",
            id: "Kamu setor",
            tr: "Yatırırsın",
            pl: "Wpłacasz",
        })}
                    </Text>
                    <ShardsInline n={effectiveBetShards} size={f.body} textColor={t.textPrimary}/>
                  </View>
                  <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                    <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {triLang(lang, {
            ru: 'Получишь',
            uk: 'Отримаєш',
            es: 'Ganas',
            'pt-BR': "Você ganha",
            vi: "Bạn nhận",
            id: "Kamu dapat",
            tr: "Kazanırsın",
            pl: "Zyskujesz",
        })}
                    </Text>
                    {/* §7: монетная часть награды = 0 — показываем только XP (строка ниже в модале). */}
                    <Text style={{ color: wagerAccent, fontSize: f.body, fontWeight: '800' }}>+{sel.rewardXP} XP</Text>
                  </View>
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.label, lineHeight: Math.round(f.label * 1.4) }}>
                  {triLang(lang, {
            ru: 'Чем длиннее срок, тем выше награда. Выбирай срок, который точно выдержишь.',
            uk: 'Що довший строк, то вища нагорода. Обирай строк, який точно витримаєш.',
            es: 'Cuanto más largo el reto, mayor la recompensa. Elige uno que puedas sostener de verdad.',
            'pt-BR': "Quanto mais longo o desafio, maior a recompensa. Escolha um que você consiga manter de verdade.",
            vi: "Thử thách càng dài, thưởng càng lớn. Hãy chọn mức bạn thật sự giữ được.",
            id: "Semakin panjang tantangan, semakin besar hadiahnya. Pilih yang benar-benar bisa kamu jaga.",
            tr: "Meydan okuma ne kadar uzunsa ödül o kadar büyük. Gerçekten sürdürebileceğini seç.",
            pl: "Im dłuższe wyzwanie, tym większa nagroda. Wybierz takie, które naprawdę utrzymasz.",
        })}
                </Text>
              </View>

              <View style={{ gap: 8, marginBottom: 18 }}>
                {[[0, 1], [2, 3], [4, 5]].map((row, ri) => (<View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map(i => {
                const tier = WAGER_TIERS[i];
                const stakeToSpend = effectiveWagerStakes[i] ?? tier.betShards;
                const icon = TIER_ICONS_WAGER[i];
                const label = streakWagerTierDaysLabel(lang, i);
                const selected = selectedTier === i;
                const afford = shardsWager >= stakeToSpend;
                const deficit = Math.max(0, stakeToSpend - shardsWager);
                return (<TouchableOpacity testID={`wager-tier-${i}`} key={i} onPress={() => setSelectedTier(i)} activeOpacity={0.75} style={{
                        flex: 1, borderRadius: 16,
                        backgroundColor: selected ? statsSoftBg(themeMode, 'wager') : statsSoftBg(themeMode, 'wager', 'quiet'),
                        borderWidth: selected ? 1.5 : 1,
                        borderColor: selected ? statsBorder(themeMode, 'wager', 'strong') : statsHairline(themeMode, 'wager'),
                        opacity: afford ? 1 : 0.45,
                        paddingVertical: 10, paddingHorizontal: 10,
                        gap: 4, minHeight: 72,
                    }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={icon} size={16} color={selected ? wagerAccent : t.textMuted}/>
                            <Text style={{ color: selected ? t.textPrimary : t.textMuted, fontSize: f.sub, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                              {label}
                            </Text>
                          </View>
                          {afford ? (<>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '600' }}>
                                  {triLang(lang, {
                            ru: 'Ставка',
                            uk: 'Ставка',
                            es: 'Aporte',
                            'pt-BR': "Aposta",
                            vi: "Mức đặt",
                            id: "Setoran",
                            tr: "Yatırılan",
                            pl: "Wpłata",
                        })}
                                </Text>
                                <ShardsInline n={stakeToSpend} size={10} textColor={t.textGhost}/>
                              </View>
                              {/* §7: чистый выигрыш в монетах = 0 — показываем XP тира. */}
                              <Text style={{ color: selected ? wagerAccent : t.textPrimary, fontSize: 13, fontWeight: '800' }}>
                                {`+${tier.rewardXP} XP`}
                              </Text>
                            </>) : (<Text style={{ color: t.textGhost, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {triLang(lang, {
                            // зачем: валюта во всём экране называется «жемчужины/перлини»,
                            // а тут стояло «мон.» — обрубок от «монет». Владелец не понял,
                            // чего именно не хватает. Пишем валюту тем же словом, что и рядом.
                            ru: `Нужно ещё ${deficit} жемчужин`,
                            uk: `Ще ${deficit} перлин`,
                            es: `Faltan ${deficit} perlas`,
                            'pt-BR': `Faltam ${deficit} pérolas`,
                            vi: `Còn thiếu ${deficit} ngọc trai`,
                            id: `Kurang ${deficit} mutiara`,
                            tr: `${deficit} inci eksik`,
                            pl: `Brakuje ${deficit} monet`,
                        })}
                            </Text>)}
                        </TouchableOpacity>);
            })}
                  </View>))}
              </View>

              {/* CTA */}
              <TouchableOpacity testID="wager-place" onPress={handlePlace} disabled={placing} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={canAfford ? [wagerAccent, wagerAccent] : [t.bgSurface, t.bgSurface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, borderWidth: canAfford ? 0 : 1, borderColor: statsHairline(themeMode, 'wager') }}>
                  {placing ? (<Text style={{ color: canAfford ? t.correctText : t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, {
                ru: 'Подтверждаем...',
                uk: 'Підтверджуємо...',
                es: 'Confirmando…',
                'pt-BR': "Confirmando…",
                vi: "Đang xác nhận…",
                id: "Mengonfirmasi…",
                tr: "Onaylanıyor…",
                pl: "Potwierdzanie…",
            })}
                    </Text>) : canAfford ? (<View style={{ alignItems: 'center', gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color={t.correctText}/>
                        <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>
                          {triLang(lang, {
                ru: 'Поставить ',
                uk: 'Поставити ',
                es: 'Aportar ',
                'pt-BR': "Apostar ",
                vi: "Đặt ",
                id: "Setor ",
                tr: "Yatır ",
                pl: "Wpłać ",
            })}
                        </Text>
                        <ShardsInline n={effectiveBetShards} size={f.body} textColor={t.correctText}/>
                      </View>
                      <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700', textAlign: 'center', opacity: 0.75 }}>
                        {triLang(lang, {
                // §7: монетный выигрыш пари = 0, награда — только опыт.
                ru: `Награда: +${sel.rewardXP} опыта`,
                uk: `Нагорода: +${sel.rewardXP} досвіду`,
                es: `Recompensa: +${sel.rewardXP} XP`,
                'pt-BR': `Recompensa: +${sel.rewardXP} XP`,
                vi: `Thưởng: +${sel.rewardXP} XP`,
                id: `Hadiah: +${sel.rewardXP} XP`,
                tr: `Ödül: +${sel.rewardXP} XP`,
                pl: `Nagroda: +${sel.rewardXP} XP`,
            })}
                      </Text>
                    </View>) : (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="lock-closed-outline" size={18} color={t.textGhost}/>
                      <Text style={{ color: t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                        {triLang(lang, {
                ru: 'Недостаточно жемчуга',
                uk: 'Недостатньо перлин',
                es: 'No tienes suficientes perlas',
                'pt-BR': "Você não tem pérolas suficientes",
                vi: "Bạn không có đủ ngọc trai",
                id: "Mutiara kamu tidak cukup",
                tr: "Yeterli incin yok",
                pl: "Nie masz wystarczająco monet",
            })}
                      </Text>
                    </View>)}
                </LinearGradient>
              </TouchableOpacity>
              </ScrollView>

          </Animated.View>
        </View>
      </Modal>
      <ThemedConfirmModal visible={wagerNeedShards} title={triLang(lang, {
            ru: 'Недостаточно жемчуга',
            uk: 'Недостатньо перлин',
            es: 'No tienes suficientes perlas',
            'pt-BR': "Você não tem pérolas suficientes",
            vi: "Bạn không có đủ ngọc trai",
            id: "Mutiara kamu tidak cukup",
            tr: "Yeterli incin yok",
            pl: "Nie masz wystarczająco monet",
        })} messageNode={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 22 }}>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'Нужно:',
                uk: 'Потрібно:',
                es: 'Hacen falta:',
                'pt-BR': "Faltam:",
                vi: "Cần thêm:",
                id: "Dibutuhkan:",
                tr: "Gerekli:",
                pl: "Potrzeba:",
            })}
            </Text>
            <ShardsInline n={effectiveBetShards} size={f.body} textColor={isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'percentiles')}/>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'жемчужин',
                uk: 'перлин',
                es: 'perlas',
                'pt-BR': "pérolas",
                vi: "xu",
                id: "fragmen",
                tr: "inci",
                pl: "monet",
            })}
            </Text>
          </View>} cancelLabel={triLang(lang, {
            ru: 'Отмена',
            uk: 'Скасувати',
            es: 'Cancelar',
            'pt-BR': "Cancelar",
            vi: "Hủy",
            id: "Batal",
            tr: "İptal",
            pl: "Anuluj",
        })} confirmLabel={triLang(lang, {
            ru: 'В магазин',
            uk: 'У магазин',
            es: 'A la tienda',
            'pt-BR': "Ir à loja",
            vi: "Đến cửa hàng",
            id: "Ke toko",
            tr: "Mağazaya",
            pl: "Do sklepu",
        })} testIDPrefix="wager-need-shards" onCancel={() => {
            setWagerNeedShards(false);
            setModalOpen(true);
        }} onConfirm={() => {
            navigateAfterModalClose(() => setWagerNeedShards(false), () => router.push({
                pathname: '/shards_shop',
                params: {
                    need: String(Math.max(0, effectiveBetShards - shardsWager)),
                    source: 'streak_wager',
                },
            } as any));
        }}/>
      <ThemedConfirmModal visible={wagerConfirm} title={triLang(lang, {
            ru: 'Подтвердить пари',
            uk: 'Підтвердити парі',
            es: 'Confirmar la apuesta',
            'pt-BR': "Confirmar a aposta",
            vi: "Xác nhận cược",
            id: "Konfirmasi taruhan",
            tr: "Bahsi onayla",
            pl: "Potwierdź zakład",
        })} messageNode={<View style={{ gap: 10, marginBottom: 22 }}>
            {/* Stake row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                ru: 'Ставка:',
                uk: 'Ставка:',
                es: 'Aporte:',
                'pt-BR': "Aposta:",
                vi: "Mức đặt:",
                id: "Setoran:",
                tr: "Yatırılan:",
                pl: "Wpłata:",
            })}
              </Text>
              <ShardsInline n={effectiveBetShards} size={f.body} textColor={t.textPrimary}/>
            </View>
            {/* Win row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Text style={{ fontSize: f.body }}>✅</Text>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>
                  {triLang(lang, {
                ru: `Цепочка ${sel.daysRequired} дней без срывов.`,
                uk: `Ланцюжок ${sel.daysRequired} днів без скидів.`,
                es: `${sel.daysRequired} días de racha seguidos sin romperla.`,
                'pt-BR': `${sel.daysRequired} dias seguidos de sequência sem quebrar.`,
                vi: `${sel.daysRequired} ngày giữ chuỗi liên tiếp không bị đứt.`,
                id: `${sel.daysRequired} hari rangkaian berturut-turut tanpa putus.`,
                tr: `${sel.daysRequired} gün üst üste seri bozulmadan.`,
                pl: `${sel.daysRequired} dni serii z rzędu bez przerwania.`,
            })}
                </Text>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                    {triLang(lang, {
                // §7: монетный выигрыш пари отключён — честно говорим об этом.
                ru: 'Жемчужный выигрыш пари отключён — награда только опытом',
                uk: 'Перлинний виграш парі вимкнено — нагорода лише досвідом',
                es: 'La ganancia en perlas está desactivada: la recompensa es solo XP',
                'pt-BR': 'O ganho em pérolas está desativado: a recompensa é só XP',
                vi: 'Phần thưởng ngọc trai đã tắt — chỉ nhận XP',
                id: 'Hadiah mutiara dinonaktifkan — hadiah hanya XP',
                tr: 'İnci kazancı kapalı — ödül yalnızca XP',
                pl: 'Wygrana monet jest wyłączona — nagroda to tylko XP',
            })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.body }}>
                    {triLang(lang, {
                ru: `+${sel.rewardXP} к опыту`,
                uk: `+${sel.rewardXP} до досвіду`,
                es: `+${sel.rewardXP} de XP`,
                'pt-BR': `+${sel.rewardXP} de XP`,
                vi: `+${sel.rewardXP} XP`,
                id: `+${sel.rewardXP} XP`,
                tr: `+${sel.rewardXP} XP`,
                pl: `+${sel.rewardXP} XP`,
            })}
                  </Text>
                </View>
              </View>
            </View>
            {/* Lose row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: f.body }}>❌</Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, flex: 1 }}>
                {triLang(lang, {
                ru: 'Пропустишь день — ставка сгорит: −',
                uk: 'Пропустиш день — ставка згорить: −',
                es: 'Si rompes la racha pierdes ',
                'pt-BR': "Se quebrar a sequência, você perde ",
                vi: "Nếu làm đứt chuỗi, bạn mất ",
                id: "Jika rangkaian putus, kamu kehilangan ",
                tr: "Seriyi bozarsan kaybedersin ",
                pl: "Jeśli przerwiesz serię, stracisz ",
            })}
              </Text>
              <ShardsInline n={effectiveBetShards} size={f.body} textColor="#FF3B30"/>
            </View>
          </View>} cancelLabel={triLang(lang, {
            ru: 'Отмена',
            uk: 'Скасувати',
            es: 'Cancelar',
            'pt-BR': "Cancelar",
            vi: "Hủy",
            id: "Batal",
            tr: "İptal",
            pl: "Anuluj",
        })} confirmLabel={triLang(lang, {
            ru: 'Поставить',
            uk: 'Поставити',
            es: 'Aportar',
            'pt-BR': "Apostar",
            vi: "Đặt",
            id: "Setor",
            tr: "Yatır",
            pl: "Wpłać",
        })} testIDPrefix="wager-confirm" onCancel={() => {
            setWagerConfirm(false);
            setModalOpen(true);
        }} onConfirm={() => {
            if (placing) return;
            setWagerConfirm(false);
            void doPlace();
        }}/>
    </>);
    // pickerOnly: размещение ставки открывается сразу из hero («Пари на серию»), CTA-карточки нет.
    if (pickerOnly)
        return pickerModals;
    return (<>
      <TouchableOpacity testID="wager-open" onPress={() => setModalOpen(true)} activeOpacity={0.86}>
        <StatsCardArtSurface testID="wager-open-card" name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={22} scrim="stats" style={[{ borderRadius: 22, padding: 14, borderWidth: 0, borderColor: wagerBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: wagerSoftBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="dice-outline" size={22} color={wagerAccent}/>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
              {triLang(lang, {
            ru: 'Пари',
            uk: 'Парі',
            es: 'Apuesta',
            'pt-BR': "Aposta",
            vi: "Cược",
            id: "Taruhan",
            tr: "Bahis",
            pl: "Zakład",
        })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4), marginTop: 2 }} numberOfLines={2}>
              {triLang(lang, {
            ru: 'Поставь жемчуг — удержи серию и забери опыт',
            uk: 'Постав перлини — утримай серію й забери досвід',
            es: 'Aporta perlas: mantén la racha y cobra la recompensa',
            'pt-BR': "Aposte pérolas: mantenha a sequência e receba a recompensa",
            vi: "Đặt ngọc trai: giữ chuỗi và nhận thưởng",
            id: "Setorkan fragmen: jaga rangkaian dan ambil hadiah",
            tr: "İnci yatır: seriyi koru ve ödülü al",
            pl: "Wpłać monety: utrzymaj serię i odbierz nagrodę",
        })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textGhost} style={{ marginTop: 13 }}/>
        </StatsCardArtSurface>
      </TouchableOpacity>

      {pickerModals}
    </>);
}
/** Цепочка дней, неделя, заморозка, перцентиль цепочки — вынесено для порядка блоков на экране. */
function StreakStatsHero({ t, f, lang, themeMode, totalStreak, bestStreak, days, freezeActive, chainShieldDays, purpleColor, isGoldTheme, isPremium, premiumFreezeUsed, freezeShardCost, shardsBalance, onFreezePress, reviveOffer, onRevivePress, percentilesStreak }: {
    t: any;
    f: any;
    lang: Lang;
    themeMode: ThemeMode;
    totalStreak: number;
    bestStreak: number;
    days: DayData[];
    freezeActive: boolean;
    chainShieldDays: number;
    purpleColor: string;
    isGoldTheme: boolean;
    isPremium: boolean;
    premiumFreezeUsed: boolean;
    freezeShardCost: number;
    shardsBalance: number;
    onFreezePress: () => void;
    reviveOffer: StreakReviveOffer | null;
    onRevivePress: () => void;
    percentilesStreak: number | null;
}) {
    const goldAccent = GOLD_RICH.metalGold;
    const goldBright = GOLD_RICH.champagne;
    const goldHairline = GOLD_RICH.hairline;
    const goldSoftBg = GOLD_RICH.wash;
    const streakAccent = isGoldTheme ? goldAccent : statsThemeAccent(themeMode);
    const streakDotSoftBg = isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet');
    const freezeAccent = isGoldTheme ? goldBright : statsAccent(themeMode, 'freeze');
    const reviveAccent = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'streak');
    const shieldAccent = isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'percentiles');
    const heroTone = freezeActive ? 'freeze' : 'streak';
    const luxuryStats = isGoldTheme;
    const luxuryLocations = isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined;
    const luxuryShadow = isGoldTheme ? goldShadow(2) : null;
    const streakFireIconVariant = getStreakFireIconVariant(themeMode, totalStreak);
    const streakFreezeIconVariant = getStreakFreezeIconVariant(themeMode);
    const streakIconVariant = freezeActive ? streakFreezeIconVariant : streakFireIconVariant;
    const streakIconInactive = !freezeActive && totalStreak <= 0;
    const streakIconSize = Math.round(f.numLg * 1.45);
    const freezeActionIconBoxSize = 34;
    const freezeActionIconSize = 28;
    const freezeActionIconFrameStyle = {
        width: freezeActionIconBoxSize,
        height: freezeActionIconBoxSize,
        borderRadius: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
        backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.16)' : streakFreezeIconVariant.backgroundColor,
        borderWidth: 0,
        borderColor: streakFreezeIconVariant.borderColor,
        shadowColor: streakFreezeIconVariant.accentColor,
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        ...noAndroidOutline,
    };
    const freezeChainIconFrameStyle = {
        width: freezeActionIconBoxSize,
        height: freezeActionIconBoxSize,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        flexShrink: 0,
    };
    const streakIconGlowStyle = streakIconInactive
        ? null
        : {
            shadowColor: streakIconVariant.accentColor,
            shadowOpacity: 0.18 + streakIconVariant.intensity * 0.10,
            shadowRadius: 5 + streakIconVariant.intensity * 5,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
        };
    const visibleStreakPercentile = visiblePercentile(percentilesStreak, totalStreak > 0);
    const cardRadius = statsSurfaceRadius(themeMode, luxuryStats ? 16 : 22);
    return (<StatsCardArtSurface name="streak" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={luxuryLocations} radius={cardRadius} scrim={freezeActive ? 'strong' : 'stats'} style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, borderColor: isGoldTheme ? (freezeActive ? GOLD_RICH.hairlineStrong : goldHairline) : statsBorder(themeMode, heroTone, 'medium'), overflow: 'hidden' }, luxuryShadow ?? statsGlowStyle(themeMode, heroTone)]}>
      {isGoldTheme && <GoldBevel radius={16} intensity="strong"/>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={[{
                width: streakIconSize,
                height: streakIconSize,
                alignItems: 'center',
                justifyContent: 'center',
            }, streakIconGlowStyle]}>
          <StreakChainIcon themeMode={themeMode} frozen={freezeActive} streakDays={totalStreak} inactive={streakIconInactive} size={streakIconSize}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg + 4, fontWeight: '700' }} numberOfLines={1}>{totalStreak}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption }}>{triLang(lang, {
            ru: 'дней подряд',
            uk: 'днів поспіль',
            es: 'días seguidos',
            'pt-BR': "dias seguidos",
            vi: "ngày liên tiếp",
            id: "hari berturut-turut",
            tr: "gün üst üste",
            pl: "dni z rzędu",
        })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: freezeAccent, fontSize: f.h1, fontWeight: '700' }}>{bestStreak}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.label }}>{triLang(lang, {
            ru: 'лучший',
            uk: 'найкращий',
            es: 'récord',
            'pt-BR': "recorde",
            vi: "kỷ lục",
            id: "rekor",
            tr: "rekor",
            pl: "rekord",
        })}</Text>
          {totalStreak >= 3 && (<TouchableOpacity activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={async () => {
                const _ru = [
                    `Моя цепочка в Phraseman — ${totalStreak} дней! 🔥 Я мощнее, чем утренняя доза кофеина. Кто догонит?`,
                    `${totalStreak} дней подряд в Phraseman! 🏆 Стабильность — моё второе имя. Английский уже как родной! 🔥`,
                    `Видишь этот огонь? 🔥 Моя цепочка уже ${totalStreak} дней в Phraseman! Ни дня без английского, ни дня без побед!`,
                    `${totalStreak} дней подряд в Phraseman! Моя дисциплина официально вышла на новый уровень. Не останавливайте меня! 🔥`,
                    `Говорят, привычка формируется 21 день. У меня уже ${totalStreak}! Phraseman — это уже стиль жизни. ☕️📖`,
                    `Моя цепочка в Phraseman горит ярче моего желания уйти в отпуск! 🔥 ${totalStreak} дней в деле!`,
                    `Моя цепочка в Phraseman горит ярче солнца! 🔥 ${totalStreak} дней подряд. Кто сможет побить мой рекорд?`,
                    `${totalStreak} дней в Phraseman! 🏆 Маленькими шагами к большой цели. Мой английский говорит мне «спасибо»!`,
                    `Не сбавляю темп! 🔥 ${totalStreak} дней обучения в Phraseman. Стабильность — признак мастерства!`,
                    `Не подходите близко — я горяч! 🔥 ${totalStreak} дней подряд в Phraseman. Английский стал моей полезной привычкой.`,
                    `Бегу марафон по английскому. Уже ${totalStreak}-й день в Phraseman без остановок! 🏃‍♀️ Кто со мной?`,
                ];
                const _uk = [
                    `Мій стрік у Phraseman — ${totalStreak} днів! 🔥 Я потужніший за ранкову дозу кофеїну. Хто наздожене?`,
                    `${totalStreak} днів поспіль у Phraseman! 🏆 Стабільність — моє друге ім\'я. Англійська вже як рідна! 🔥`,
                    `Бачиш цей вогонь? 🔥 Це мій стрік ${totalStreak} днів у Phraseman! Жодного дня без англійської, жодного дня без перемог!`,
                    `${totalStreak} днів поспіль у Phraseman! Моя дисципліна офіційно вийшла на новий рівень. Не зупиняйте мене! 🔥`,
                    `Кажуть, звичка формується 21 день. У мене вже ${totalStreak}! Phraseman — це вже стиль життя. ☕️📖`,
                    `Мій стрік у Phraseman горить яскравіше за моє бажання піти у відпустку! 🔥 ${totalStreak} днів у справі!`,
                    `Мій стрік у Phraseman горить яскравіше за сонце! 🔥 ${totalStreak} днів поспіль. Хто зможе побити мій рекорд?`,
                    `${totalStreak} днів у Phraseman! 🏆 Маленькими кроками до великої мети. Моя англійська каже мені «дякую»!`,
                    `Не збавляю темп! 🔥 ${totalStreak} днів навчання у Phraseman. Стабільність — ознака майстерності!`,
                    `Не підходьте близько — я гарячий! 🔥 ${totalStreak} днів стріку у Phraseman. Англійська стала моєю корисною звичкою.`,
                    `Біжу марафон з англійської. Вже ${totalStreak}-й день у Phraseman без зупинок! 🏃‍♀️ Хто зі мною?`,
                ];
                const _es = [
                    `Mi racha en Phraseman: ¡${totalStreak} días! 🔥 Más fuerte que el café de la mañana. ¿Quién me alcanza?`,
                    `¡${totalStreak} días seguidos en Phraseman! 🏆 La constancia es mi segundo nombre. ¡El inglés ya se siente natural! 🔥`,
                    `¿Ves ese fuego? 🔥 Es mi racha de ${totalStreak} días en Phraseman. Ni un día sin inglés, ni un día sin ganar.`,
                    `¡${totalStreak} días seguidos en Phraseman! Mi disciplina subió de nivel. ¡No me frenes! 🔥`,
                    `Dicen que un hábito tarda 21 días. ¡Yo llevo ${totalStreak}! Phraseman ya es estilo de vida. ☕️📖`,
                    `¡Mi racha en Phraseman arde más que mis ganas de vacaciones! 🔥 ${totalStreak} días y sumando.`,
                    `¡Mi racha en Phraseman brilla más que el sol! 🔥 ${totalStreak} días seguidos. ¿Quién bate mi récord?`,
                    `¡${totalStreak} días en Phraseman! 🏆 Paso a paso hacia la meta. ¡Mi inglés me lo agradece!`,
                    `¡No bajo el ritmo! 🔥 ${totalStreak} días estudiando en Phraseman. ¡La constancia es maestría!`,
                    `¡Cuidado, que quemo! 🔥 ${totalStreak} días de racha en Phraseman. El inglés ya es mi buen hábito.`,
                    `Maratón de inglés: día ${totalStreak} en Phraseman sin parar. 🏃 ¿Quién se une?`,
                ];
                const _ptBR = [
                    `Minha sequência no Phraseman: ${totalStreak} dias! 🔥 Mais forte que o café da manhã. Quem me alcança?`,
                    `${totalStreak} dias seguidos no Phraseman! 🏆 Constância é meu sobrenome. O inglês já flui! 🔥`,
                    `Tá vendo esse fogo? 🔥 É minha sequência de ${totalStreak} dias no Phraseman. Nenhum dia sem inglês, nenhum dia sem vitória!`,
                    `${totalStreak} dias seguidos no Phraseman! Minha disciplina subiu de nível. Não me segura! 🔥`,
                    `Dizem que um hábito leva 21 dias. Eu já estou em ${totalStreak}! Phraseman virou estilo de vida. ☕️📖`,
                    `Minha sequência no Phraseman queima mais que minha vontade de tirar férias! 🔥 ${totalStreak} dias em ação!`,
                    `Minha sequência no Phraseman brilha mais que o sol! 🔥 ${totalStreak} dias seguidos. Quem bate meu recorde?`,
                    `${totalStreak} dias no Phraseman! 🏆 Passo a passo rumo à meta. Meu inglês agradece!`,
                    `Sem perder o ritmo! 🔥 ${totalStreak} dias estudando no Phraseman. Constância é maestria!`,
                    `Cuidado, tô pegando fogo! 🔥 ${totalStreak} dias de sequência no Phraseman. O inglês já é meu bom hábito.`,
                    `Maratona de inglês: dia ${totalStreak} no Phraseman sem parar! 🏃 Quem vem comigo?`,
                ];
                const _vi = [
                    `Chuỗi ngày của tôi trên Phraseman: ${totalStreak} ngày! 🔥 Mạnh hơn cả ly cà phê sáng. Ai đuổi kịp nào?`,
                    `${totalStreak} ngày liên tiếp trên Phraseman! 🏆 Kiên trì là tên đệm của tôi. Tiếng Anh đã thành tự nhiên! 🔥`,
                    `Thấy ngọn lửa này chứ? 🔥 Đó là chuỗi ${totalStreak} ngày của tôi trên Phraseman. Không ngày nào thiếu tiếng Anh!`,
                    `${totalStreak} ngày liên tiếp trên Phraseman! Kỷ luật của tôi đã lên một tầm cao mới. Đừng cản tôi! 🔥`,
                    `Người ta nói thói quen cần 21 ngày. Tôi đã ${totalStreak} ngày! Phraseman giờ là phong cách sống. ☕️📖`,
                    `Chuỗi ngày trên Phraseman của tôi cháy hơn cả mong muốn đi nghỉ! 🔥 ${totalStreak} ngày rồi!`,
                    `Chuỗi ngày của tôi trên Phraseman sáng hơn mặt trời! 🔥 ${totalStreak} ngày liên tiếp. Ai phá được kỷ lục của tôi?`,
                    `${totalStreak} ngày trên Phraseman! 🏆 Từng bước nhỏ đến mục tiêu lớn. Tiếng Anh của tôi cảm ơn tôi!`,
                    `Không giảm tốc! 🔥 ${totalStreak} ngày học trên Phraseman. Kiên trì là dấu hiệu của bậc thầy!`,
                    `Cẩn thận, tôi đang nóng đây! 🔥 ${totalStreak} ngày liên tiếp trên Phraseman. Tiếng Anh đã thành thói quen tốt.`,
                    `Chạy marathon tiếng Anh. Đã sang ngày ${totalStreak} trên Phraseman không nghỉ! 🏃 Ai cùng tôi nào?`,
                ];
                const _id = [
                    `Rentetan harianku di Phraseman: ${totalStreak} hari! 🔥 Lebih kuat dari kopi pagi. Siapa yang bisa menyusul?`,
                    `${totalStreak} hari berturut-turut di Phraseman! 🏆 Konsistensi nama tengahku. Bahasa Inggris terasa makin natural! 🔥`,
                    `Lihat api ini? 🔥 Itu rentetan ${totalStreak} hariku di Phraseman. Tak ada hari tanpa bahasa Inggris!`,
                    `${totalStreak} hari berturut-turut di Phraseman! Disiplinku naik level. Jangan hentikan aku! 🔥`,
                    `Katanya kebiasaan terbentuk dalam 21 hari. Aku sudah ${totalStreak}! Phraseman jadi gaya hidup. ☕️📖`,
                    `Rentetanku di Phraseman menyala lebih panas dari keinginanku berlibur! 🔥 ${totalStreak} hari beraksi!`,
                    `Rentetanku di Phraseman bersinar lebih terang dari matahari! 🔥 ${totalStreak} hari berturut-turut. Siapa yang bisa mengalahkan rekorku?`,
                    `${totalStreak} hari di Phraseman! 🏆 Langkah demi langkah menuju tujuan. Bahasa Inggrisku berterima kasih!`,
                    `Tak mengendurkan tempo! 🔥 ${totalStreak} hari belajar di Phraseman. Konsistensi tanda keahlian!`,
                    `Hati-hati, aku lagi panas! 🔥 ${totalStreak} hari beruntun di Phraseman. Bahasa Inggris jadi kebiasaan baikku.`,
                    `Maraton bahasa Inggris. Sudah hari ke-${totalStreak} di Phraseman tanpa henti! 🏃 Siapa ikut?`,
                ];
                const _tr = [
                    `Phraseman'deki serim: ${totalStreak} gün! 🔥 Sabah kahvesinden bile güçlü. Yetişebilen var mı?`,
                    `${totalStreak} gün üst üste Phraseman'de! 🏆 İstikrar benim ikinci adım. İngilizce artık ana dilim gibi! 🔥`,
                    `Bu ateşi görüyor musun? 🔥 Phraseman'de ${totalStreak} günlük serim! İngilizcesiz bir gün yok, zafersiz bir gün yok!`,
                    `${totalStreak} gün üst üste Phraseman'de! Disiplinim resmen yeni bir seviyeye çıktı. Beni durdurmayın! 🔥`,
                    `Alışkanlık 21 günde oluşur derler. Bende çoktan ${totalStreak} oldu! Phraseman artık bir yaşam tarzı. ☕️📖`,
                    `Phraseman'deki serim tatile çıkma isteğimden bile parlak yanıyor! 🔥 ${totalStreak} gündür iş başında!`,
                    `Phraseman'deki serim güneşten bile parlak! 🔥 ${totalStreak} gün üst üste. Rekorumu kim kırabilir?`,
                    `Phraseman'de ${totalStreak} gün! 🏆 Küçük adımlarla büyük hedefe. İngilizcem bana teşekkür ediyor!`,
                    `Tempoyu düşürmüyorum! 🔥 Phraseman'de ${totalStreak} gün çalışma. İstikrar ustalığın işaretidir!`,
                    `Yaklaşma, yanıyorum! 🔥 Phraseman'de ${totalStreak} gün üst üste. İngilizce artık iyi bir alışkanlığım.`,
                    `İngilizce maratonu. Phraseman'de durmadan ${totalStreak}. gün! 🏃 Benimle gelen?`,
                ];
                const _pl = [
                    `Moja seria w Phraseman: ${totalStreak} dni! 🔥 Mocniejsza niż poranna kawa. Kto mnie dogoni?`,
                    `${totalStreak} dni z rzędu w Phraseman! 🏆 Konsekwencja to moje drugie imię. Angielski wchodzi naturalnie! 🔥`,
                    `Widzisz ten ogień? 🔥 To moja seria ${totalStreak} dni w Phraseman! Ani dnia bez angielskiego, ani dnia bez zwycięstwa!`,
                    `${totalStreak} dni z rzędu w Phraseman! Moja dyscyplina oficjalnie weszła na wyższy poziom. Nie zatrzymujcie mnie! 🔥`,
                    `Mówią, że nawyk tworzy się przez 21 dni. Ja mam już ${totalStreak}! Phraseman to już styl życia. ☕️📖`,
                    `Moja seria w Phraseman płonie mocniej niż chęć urlopu! 🔥 ${totalStreak} dni w akcji!`,
                    `Moja seria w Phraseman świeci jaśniej niż słońce! 🔥 ${totalStreak} dni z rzędu. Kto pobije mój rekord?`,
                    `${totalStreak} dni w Phraseman! 🏆 Małymi krokami do wielkiego celu. Mój angielski mi dziękuje!`,
                    `Nie zwalniam tempa! 🔥 ${totalStreak} dni nauki w Phraseman. Konsekwencja to oznaka mistrzostwa!`,
                    `Nie podchodź — jestem rozgrzany! 🔥 ${totalStreak} dni serii w Phraseman. Angielski stał się moim dobrym nawykiem.`,
                    `Biegnę maraton z angielskiego. Już ${totalStreak}. dzień w Phraseman bez przerwy! 🏃 Kto ze mną?`,
                ];
                const _byLang: Record<string, string[]> = {
                    ru: _ru, uk: _uk, es: _es,
                    'pt-BR': _ptBR, vi: _vi, id: _id, tr: _tr, pl: _pl,
                };
                const _p = _byLang[lang] ?? _ru;
                const msg = _p[Math.floor(Math.random() * _p.length)] + `\n${STORE_URL}`;
                await Share.share({ message: msg }).catch(() => { });
            }}>
              <Ionicons name="share-outline" size={14} color={t.textGhost}/>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {triLang(lang, {
                ru: 'Поделиться',
                uk: 'Поділитися',
                es: 'Compartir',
                'pt-BR': "Compartilhar",
                vi: "Chia sẻ",
                id: "Bagikan",
                tr: "Paylaş",
                pl: "Udostępnij",
            })}
              </Text>
            </TouchableOpacity>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {streakWeekRowShort(lang).map((d, i) => {
            const todayIdx = (new Date().getDay() + 6) % 7;
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - todayIdx);
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const dateStr = toDateStr(dayDate);
            const dayInfo = days.find(x => x.date === dateStr);
            const done = dayInfo?.active;
            const isToday = i === todayIdx;
            return (<View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={[
                    { width: 22, height: 22, borderRadius: 11, backgroundColor: streakDotSoftBg },
                    done && { backgroundColor: isGoldTheme ? (isToday ? GOLD_RICH.champagne : GOLD_RICH.metalGold) : streakAccent },
                    isToday && !done && { backgroundColor: streakDotSoftBg, borderWidth: 0, borderColor: streakAccent },
                ]}/>
              <Text style={{ color: isToday ? t.textPrimary : (done ? t.textPrimary : t.textGhost), fontSize: 12, fontWeight: isToday ? '700' : '600' }}>{d}</Text>
            </View>);
        })}
      </View>
      {visibleStreakPercentile !== null && (<View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: isGoldTheme ? goldSoftBg : statsSoftBg(themeMode, 'streak', 'quiet'), borderRadius: 10,
                padding: 10, marginTop: 10,
                borderWidth: 0, borderColor: isGoldTheme ? goldHairline : statsHairline(themeMode, 'streak'),
            }}>
          <StreakChainIcon themeMode={themeMode} frozen={false} streakDays={totalStreak} size={20}/>
          <Text style={{ color: t.textPrimary, fontSize: f.label, flex: 1, lineHeight: f.label * 1.4 }}>
            {triLang(lang, {
                ru: `Твоя цепочка ${totalStreak} дн. обходит ${visibleStreakPercentile}% пользователей`,
                uk: `Ваш ланцюжок ${totalStreak} дн. обганяє ${visibleStreakPercentile}% користувачів`,
                es: `Tu racha de ${totalStreak} días supera al ${visibleStreakPercentile}% de usuarios`,
                'pt-BR': `Sua sequência de ${totalStreak} dias supera ${visibleStreakPercentile}% dos usuários`,
                vi: `Chuỗi ${totalStreak} ngày của bạn vượt ${visibleStreakPercentile}% người dùng`,
                id: `Rangkaian ${totalStreak} harimu melampaui ${visibleStreakPercentile}% pengguna`,
                tr: `${totalStreak} günlük serin kullanıcıların %${visibleStreakPercentile} bölümünü geçiyor`,
                pl: `Twoja seria ${totalStreak} dni przebija ${visibleStreakPercentile}% użytkowników`,
            })}
          </Text>
        </View>)}
      <View style={{ marginTop: 14 }}>
        {chainShieldDays > 0 && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isGoldTheme ? goldSoftBg : statsSoftBg(themeMode, 'percentiles', 'quiet'), borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={shieldAccent}/>
            <Text style={{ color: shieldAccent, fontSize: f.body, fontWeight: '600', flex: 1 }}>
              {triLang(lang, {
                ru: `Заморозка активна: ${chainShieldDays} ${pluralRu(chainShieldDays, 'день', 'дня', 'дней')}`,
                uk: `Заморозка активна: ${chainShieldDays} дн.`,
                es: `Congelación activa: ${chainShieldDays} días`,
                'pt-BR': `Congelamento ativo: ${chainShieldDays} dias`,
                vi: `Đang đóng băng: ${chainShieldDays} ngày`,
                id: `Pembekuan aktif: ${chainShieldDays} hari`,
                tr: `Dondurma aktif: ${chainShieldDays} gün`,
                pl: `Zamrożenie aktywne: ${chainShieldDays} dni`,
            })}
            </Text>
          </View>)}
        {reviveOffer && (<TouchableOpacity onPress={onRevivePress} activeOpacity={0.86} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 0, borderColor: reviveAccent, paddingVertical: 11, paddingHorizontal: 16, marginBottom: 8, backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'streak', 'quiet') }}>
            <View style={[freezeActionIconFrameStyle, { backgroundColor: isGoldTheme ? 'rgba(246,227,161,0.16)' : statsSoftBg(themeMode, 'streak', 'normal'), borderColor: reviveAccent }]}>
              <Ionicons name="refresh-circle-outline" size={freezeActionIconSize} color={reviveAccent}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: reviveAccent, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                ru: 'Восстановить цепочку',
                uk: 'Відновити ланцюжок',
                es: 'Recuperar la racha',
                'pt-BR': "Restaurar sequência",
                vi: "Khôi phục chuỗi",
                id: "Pulihkan rangkaian",
                tr: "Seriyi yenile",
                pl: "Odnów serię",
            })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {triLang(lang, {
                ru: `Верни ${reviveOffer.lostStreak} дн. — только сегодня`,
                uk: `Поверни ${reviveOffer.lostStreak} дн. — лише сьогодні`,
                es: `${reviveOffer.lostStreak} días disponible hoy`,
                'pt-BR': `${reviveOffer.lostStreak} dias disponível hoje`,
                vi: `${reviveOffer.lostStreak} ngày khả dụng hôm nay`,
                id: `${reviveOffer.lostStreak} hari tersedia hari ini`,
                tr: `${reviveOffer.lostStreak} gün bugün kullanılabilir`,
                pl: `${reviveOffer.lostStreak} dni dostępne dziś`,
            })}
                </Text>
                <ShardsInline n={reviveOffer.costShards} size={f.label} textColor={t.textGhost}/>
              </View>
            </View>
          </TouchableOpacity>)}
        {freezeActive ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isGoldTheme ? goldSoftBg : statsSoftBg(themeMode, 'freeze', 'quiet'), borderRadius: 12, padding: 12 }}>
            <View style={freezeChainIconFrameStyle}>
              <StreakChainIcon themeMode={themeMode} frozen streakDays={totalStreak} size={freezeActionIconSize}/>
            </View>
            <Text style={{ color: freezeAccent, fontSize: f.body, fontWeight: '600', flex: 1 }}>
              {triLang(lang, {
                ru: 'Цепочка заморожена на сегодня',
                uk: 'Ланцюжок заморожено на сьогодні',
                es: 'Racha congelada por hoy',
                'pt-BR': "Sequência congelada por hoje",
                vi: "Chuỗi đã được đóng băng hôm nay",
                id: "Rangkaian dibekukan untuk hari ini",
                tr: "Seri bugün donduruldu",
                pl: "Seria zamrożona na dziś",
            })}
            </Text>
          </View>) : (<TouchableOpacity activeOpacity={0.75} onPress={onFreezePress} disabled={chainShieldDays > 0} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 0, borderColor: streakAccent, paddingVertical: 11, paddingHorizontal: 16, opacity: chainShieldDays > 0 ? 0.4 : 1 }}>
            <View style={freezeChainIconFrameStyle}>
              <StreakChainIcon themeMode={themeMode} frozen streakDays={totalStreak} size={freezeActionIconSize}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: freezeAccent, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, {
                ru: 'Заморозить цепочку',
                uk: 'Заморозити ланцюжок',
                es: 'Congelar la racha',
                'pt-BR': "Congelar a sequência",
                vi: "Đóng băng chuỗi",
                id: "Bekukan rangkaian",
                tr: "Seriyi dondur",
                pl: "Zamroź serię",
            })}
              </Text>
              {isPremium && premiumFreezeUsed ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>{freezeShardCost}</Text>
                  <Image source={oskolokImageForPackShards(freezeShardCost)} style={{ width: 14, height: 14 }}/>
                </View>) : (<Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1 }}>
                  {isPremium
                    ? triLang(lang, {
                        ru: 'Бесплатно (Плюс)',
                        uk: 'Безкоштовно (Плюс)',
                        es: 'Gratis (Plus)',
                        'pt-BR': "Grátis (Plus)",
                        vi: "Miễn phí (Plus)",
                        id: "Gratis (Plus)",
                        tr: "Ücretsiz (Plus)",
                        pl: "Gratis (Plus)",
                    })
                    : triLang(lang, {
                        ru: 'Нужен Плюс',
                        uk: 'Потрібен Плюс',
                        es: 'Se necesita Plus',
                        'pt-BR': "Precisa de Plus",
                        vi: "Cần Plus",
                        id: "Perlu Plus",
                        tr: "Plus gerekli",
                        pl: "Wymagane Plus",
                    })}
                </Text>)}
            </View>
            {!isPremium && <PlusBadge themeMode={themeMode} size="xs" />}
          </TouchableOpacity>)}
      </View>
    </StatsCardArtSurface>);
}
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
    const isBusiness = isBusinessMode(themeMode);
    const scoreAccent = isGoldTheme ? GOLD_RICH.champagne : isBusiness ? t.accent : metrics.scoreColor;
    const scoreSoftBg = isGoldTheme ? GOLD_RICH.wash : isBusiness ? t.accentBg : metrics.scoreColor + '24';
    const scoreBorder = isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'practiceBalance', 'medium');
    // Слияние «Баланс практики» + «Ритм недели»: одна карточка «Твоя неделя».
    // Прежние расплывчатые сигналы («ровно», «держится») заменены конкретными фактами.
    const maxCombined = Math.max(1, ...metrics.rhythmDays.map((d) => d.combined));
    const weekFacts = [
        {
            icon: 'calendar-outline' as const,
            label: triLang(lang, {
                ru: 'Дни',
                uk: 'Дні',
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
                es: 'Tiempo',
                'pt-BR': "Tempo",
                vi: "Thời gian",
                id: "Waktu",
                tr: "Süre",
                pl: "Czas",
            }),
            value: humanMinutes(metrics.minutes7, lang),
        },
        {
            icon: 'flash-outline' as const,
            label: streakWeeklyExperienceLabel(lang),
            value: String(metrics.xp7),
        },
    ];
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    return (<StatsCardArtSurface name="practiceBalance" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} scrim="stats" testID="stats-learning-health-card" style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, borderColor: scoreBorder, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'practiceBalance')]}>
      {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <StatScoreRing
          progress={metrics.isWarmup ? Math.min(100, (metrics.active7 / 5) * 100) : metrics.score}
          centerValue={metrics.isWarmup ? metrics.active7 : metrics.score}
          centerSubLabel={metrics.scoreSubLabel}
          accent={scoreAccent}
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? t.accent : metrics.scoreColor + 'B0'}
          trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsSoftBg(themeMode, 'practiceBalance', 'quiet')}
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
            topLabel: d.points > 0 ? `${d.points} XP` : (d.minutes > 0 ? humanMinutes(d.minutes, lang) : ''),
            bottomLabel: d.shortLabel,
            highlight: d.isToday,
        }))}
          accent={scoreAccent}
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : isBusiness ? t.accent : metrics.scoreColor + 'CC'}
          inactiveColor={statsSoftBg(themeMode, 'practiceBalance', 'quiet')}
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

      {/* Bento 3-up: Дни / Время / Опыт — конкретные факты недели. */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {weekFacts.map((item) => (<View key={item.label} style={{ flex: 1, minWidth: 0, minHeight: 96, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance'), alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={item.icon} size={18} color={scoreAccent}/>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center', lineHeight: f.body * 1.2 }} numberOfLines={2}>
              {item.value}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '800', textAlign: 'center', marginTop: 'auto', textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
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
                    'pt-BR': `+${p} ${p === 1 ? 'frase' : 'frases'}`,
                    vi: `+${p} cụm từ`,
                    id: `+${p} frasa`,
                    tr: `+${p} kalıp`,
                    pl: `+${p} ${p === 1 ? 'fraza' : 'fraz'}`,
                }) : '';
                const joined = [wordsPart, phrasesPart].filter(Boolean).join(triLang(lang, {
                    ru: ' и ', uk: ' і ', es: ' y ', 'pt-BR': ' e ', vi: ' và ', id: ' dan ', tr: ' ve ', pl: ' i ',
                }));
                return triLang(lang, {
                    ru: `${joined} за неделю`,
                    uk: `${joined} за тиждень`,
                    es: `${joined} esta semana`,
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
          <Ionicons name={weekDeltaMinutes > 0 ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={weekDeltaMinutes > 0 ? '#35D07F' : t.textMuted}/>
          <Text style={{ color: weekDeltaMinutes > 0 ? '#35D07F' : t.textMuted, fontSize: f.sub, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {triLang(lang, {
                ru: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'больше' : 'меньше'}, чем неделю назад`,
                uk: `На ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'більше' : 'менше'}, ніж тиждень тому`,
                es: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'más' : 'menos'} que hace una semana`,
                'pt-BR': `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'a mais' : 'a menos'} que há uma semana`,
                vi: `${weekDeltaMinutes > 0 ? 'Nhiều hơn' : 'Ít hơn'} ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} so với tuần trước`,
                id: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'lebih banyak' : 'lebih sedikit'} dari minggu lalu`,
                tr: `Geçen haftadan ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'fazla' : 'az'}`,
                pl: `O ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'więcej' : 'mniej'} niż tydzień temu`,
            })}
          </Text>
        </View>) : null}

      {showAction ? (<View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance') }}>
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
    es: string;
    'pt-BR': string;
    vi: string;
    id: string;
    tr: string;
    pl: string;
}> = {
    xp: { ru: 'Опыт', uk: 'Досвід', es: 'XP', 'pt-BR': 'XP', vi: 'XP', id: 'XP', tr: 'XP', pl: 'XP' },
    time: { ru: 'Время', uk: 'Час', es: 'Tiempo', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas' },
    year: { ru: 'Год', uk: 'Рік', es: 'Año', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' },
};

/** Порядок опций сегмент-переключателя недели (как в утверждённом макете). */
const WEEK_SEGMENT_METRICS: readonly StatsPrimaryMetric[] = ['time', 'xp', 'year'];

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
        width.value = withDelay(delayMs, withTiming(clamped, { duration: 620, easing: Easing.out(Easing.cubic) }));
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
    chainShieldDays: number;
    streakAtRisk: boolean;
    reviveOffer: StreakReviveOffer | null;
    seriesOpen: boolean;
    onToggleSeries: () => void;
    onFreezeStreak: () => void;
    onReviveStreak: () => void;
    onOpenWager: () => void;
    freezeShardCost: number;
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
    chainShieldDays,
    streakAtRisk,
    reviveOffer,
    seriesOpen,
    onToggleSeries,
    onFreezeStreak,
    onReviveStreak,
    onOpenWager,
    freezeShardCost,
}: StreakHeroCardProps) {
    const tone = 'streak' as const;
    // BUG 4: вся карточка — от главного акцента темы (единый hue).
    const accent = isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode);
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const streakCaption = triLang(lang, {
        ru: pluralRu(totalStreak, 'день подряд', 'дня подряд', 'дней подряд'),
        uk: pluralRu(totalStreak, 'день поспіль', 'дні поспіль', 'днів поспіль'),
        es: 'días seguidos',
        'pt-BR': 'dias seguidos',
        vi: 'ngày liên tiếp',
        id: 'hari berturut-turut',
        tr: 'gün üst üste',
        pl: 'dni z rzędu',
    });
    const recordWord = triLang(lang, { ru: 'рекорд', uk: 'рекорд', es: 'récord', 'pt-BR': 'recorde', vi: 'kỷ lục', id: 'rekor', tr: 'rekor', pl: 'rekord' });
    const fromWord = triLang(lang, { ru: 'от', uk: 'від', es: 'desde', 'pt-BR': 'desde', vi: 'từ', id: 'dari', tr: 'min.', pl: 'od' });
    const weekDays = rhythmDays.slice(-7);
    return (
        <StatsCardArtSurface
          testID="stats-streak-hero"
          name={tone}
          theme={t}
          isGoldTheme={isGoldTheme}
          gradientColors={statsCardGradient(t)}
          gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          radius={cardRadius}
          style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, tone)]}
        >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            <Pressable testID="stats-primary-series" onPress={onToggleSeries} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, tone) }}>
                        <StreakChainIcon themeMode={themeMode} frozen={freezeActive} streakDays={totalStreak} size={46} inactive={!freezeActive && totalStreak <= 0} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.numLg + 16, fontWeight: '900', lineHeight: (f.numLg + 16) * 1.05 }}>{totalStreak}</Text>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 2 }}>{streakCaption}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: accent, fontSize: f.h1, fontWeight: '900' }}>{bestStreak}</Text>
                        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', marginTop: 2 }}>{recordWord}</Text>
                    </View>
                    <Ionicons name={seriesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textGhost} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, tone) }}>
                    {weekDays.map((day) => (
                        <View key={day.date} style={{ alignItems: 'center', gap: 5 }}>
                            <View style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: day.active ? accent : (isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet')),
                                borderWidth: day.isToday ? 2 : 0,
                                borderColor: t.textPrimary,
                            }}>
                                {day.active ? <Ionicons name="checkmark" size={14} color={t.bgCard} /> : null}
                            </View>
                            <Text style={{ color: day.isToday ? t.textPrimary : t.textMuted, fontSize: f.label, fontWeight: day.isToday ? '800' : '600' }}>{day.shortLabel}</Text>
                        </View>
                    ))}
                </View>
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
                            {chainShieldDays > 0 ? ` · ${chainShieldDays}` : ''}
                        </Text>
                    </View>
                    {streakAtRisk && !freezeActive ? (
                        <TouchableOpacity testID="stats-series-freeze-action" activeOpacity={0.82} onPress={onFreezeStreak} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="snow-outline" size={19} color={accent} />
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                                {triLang(lang, { ru: 'Защитить серию', uk: 'Захистити серію', es: 'Proteger racha', 'pt-BR': 'Proteger sequência', vi: 'Bảo vệ chuỗi', id: 'Lindungi rangkaian', tr: 'Seriyi koru', pl: 'Chroń serię' })}
                            </Text>
                            <ShardsInline n={freezeShardCost} size={f.label} textColor={t.textGhost} />
                        </TouchableOpacity>
                    ) : null}
                    {totalStreak >= 3 ? (
                        <TouchableOpacity testID="stats-series-wager-action" activeOpacity={0.82} onPress={onOpenWager} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="flag-outline" size={19} color={accent} />
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                                {triLang(lang, { ru: 'Пари на серию', uk: 'Парі на серію', es: 'Apuesta de racha', 'pt-BR': 'Aposta de sequência', vi: 'Cược chuỗi', id: 'Taruhan rangkaian', tr: 'Seri bahsi', pl: 'Zakład o serię' })}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '700' }}>{fromWord}</Text>
                                <ShardsInline n={1} size={f.label} textColor={t.textGhost} />
                            </View>
                        </TouchableOpacity>
                    ) : null}
                    {reviveOffer ? (
                        <TouchableOpacity testID="stats-series-revive-action" activeOpacity={0.82} onPress={onReviveStreak} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Ionicons name="refresh-outline" size={19} color={accent} />
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                                {triLang(lang, { ru: 'Восстановить серию', uk: 'Відновити серію', es: 'Restaurar racha', 'pt-BR': 'Restaurar sequência', vi: 'Khôi phục chuỗi', id: 'Pulihkan rangkaian', tr: 'Seriyi geri yükle', pl: 'Przywróć serię' })}
                            </Text>
                            <ShardsInline n={reviveOffer.costShards} size={f.label} textColor={t.textGhost} />
                        </TouchableOpacity>
                    ) : null}
                </Reanimated.View>
            ) : null}
        </StatsCardArtSurface>
    );
}

type XpLevelCardProps = StatsSectionThemeProps & {
    totalXP: number;
    weekXP: number;
};

function XpLevelCard({ t, f, lang, themeMode, isGoldTheme, totalXP, weekXP }: XpLevelCardProps) {
    const [expanded, setExpanded] = useState(false);
    const tone = 'multipliers' as const;
    // BUG 4: вся карточка — от главного акцента темы (единый hue).
    const accent = isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode);
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const safeTotal = Math.max(0, Math.floor(totalXP));
    const safeWeek = Math.max(0, Math.floor(weekXP));
    const level = getLevelFromXP(safeTotal);
    const needed = Math.max(1, TOTAL_XP_FOR_LEVEL(level + 1) - TOTAL_XP_FOR_LEVEL(level));
    const inLevel = Math.max(0, safeTotal - TOTAL_XP_FOR_LEVEL(level));
    const remaining = Math.max(0, TOTAL_XP_FOR_LEVEL(level + 1) - safeTotal);
    const levelTitle = triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}`, 'pt-BR': `Nível ${level}`, vi: `Cấp ${level}`, id: `Level ${level}`, tr: `Seviye ${level}`, pl: `Poziom ${level}` });
    const remainingText = triLang(lang, {
        ru: `до ${level + 1}-го — ${remaining.toLocaleString('ru-RU')} XP`,
        uk: `до ${level + 1} — ${remaining.toLocaleString('ru-RU')} XP`,
        es: `${remaining.toLocaleString('ru-RU')} XP hasta el nivel ${level + 1}`,
        'pt-BR': `${remaining.toLocaleString('ru-RU')} XP até o nível ${level + 1}`,
        vi: `còn ${remaining.toLocaleString('ru-RU')} XP đến cấp ${level + 1}`,
        id: `${remaining.toLocaleString('ru-RU')} XP ke level ${level + 1}`,
        tr: `${level + 1}. seviye için ${remaining.toLocaleString('ru-RU')} XP`,
        pl: `${remaining.toLocaleString('ru-RU')} XP do poziomu ${level + 1}`,
    });
    return (
        <StatsCardArtSurface
          testID="stats-xp-level-card"
          name={tone}
          theme={t}
          isGoldTheme={isGoldTheme}
          gradientColors={statsCardGradient(t)}
          gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          radius={cardRadius}
          style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, tone)]}
        >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            <Pressable
              testID="stats-xp-progress-expand"
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => { hapticTap(); setExpanded((value) => !value); }}
              style={({ pressed }) => [pressed && { opacity: 0.92 }]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ flex: 1, minWidth: 0, color: accent, fontSize: f.label, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{levelTitle}</Text>
                    <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '600', flexShrink: 1 }}>{remainingText}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={t.textGhost} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.numLg + 8, fontWeight: '900', lineHeight: (f.numLg + 8) * 1.1 }}>{safeTotal.toLocaleString('ru-RU')}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '800' }}>XP</Text>
                </View>
                <View style={{ marginTop: 10 }}>
                    <AnimatedFillBar ratio={inLevel / needed} color={accent} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet')} height={12} delayMs={200} />
                </View>
            </Pressable>
            {expanded ? (
                <Reanimated.View entering={FadeInDown.duration(220)} testID="stats-xp-progress-details" style={{ gap: 10, paddingTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>{triLang(lang, { ru: 'Прогресс уровня', uk: 'Прогрес рівня', es: 'Progreso del nivel', 'pt-BR': 'Progresso do nível', vi: 'Tiến độ cấp', id: 'Progres level', tr: 'Seviye ilerlemesi', pl: 'Postęp poziomu' })}</Text>
                        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{`${inLevel.toLocaleString('ru-RU')} / ${needed.toLocaleString('ru-RU')} XP`}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>{triLang(lang, { ru: 'Опыт за неделю', uk: 'Досвід за тиждень', es: 'XP semanal', 'pt-BR': 'XP da semana', vi: 'XP trong tuần', id: 'XP mingguan', tr: 'Haftalık XP', pl: 'XP w tygodniu' })}</Text>
                        <Text style={{ color: accent, fontSize: f.caption, fontWeight: '800' }}>{`+${safeWeek.toLocaleString('ru-RU')} XP`}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>{triLang(lang, { ru: 'Всего накоплено', uk: 'Усього накопичено', es: 'Total acumulado', 'pt-BR': 'Total acumulado', vi: 'Tổng đã tích lũy', id: 'Total terkumpul', tr: 'Toplam biriken', pl: 'Łącznie zebrano' })}</Text>
                        <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>{`${safeTotal.toLocaleString('ru-RU')} XP`}</Text>
                    </View>
                </Reanimated.View>
            ) : null}
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
    statsDevUnlock,
    weekDeltaMinutes,
    metric,
    onSelectMetric,
}: StatsSectionThemeProps & {
    metrics: LearningCoachMetrics;
    isPremium: boolean;
    statsDevUnlock: boolean;
    weekDeltaMinutes: number | null;
    metric: StatsPrimaryMetric;
    onSelectMetric: (metric: StatsPrimaryMetric) => void;
}) {
    // BUG 4: главный акцент темы — единый hue для графика, сегментов и скраб-пузыря.
    const accent = isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode);
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const [scrubHintSeen, setScrubHintSeen] = useState(true);
    useEffect(() => {
        let cancelled = false;
        void AsyncStorage.getItem(STATS_CHART_SCRUB_HINT_KEY).then((value) => {
            if (!cancelled && value !== '1') setScrubHintSeen(false);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);
    const dismissScrubHint = useCallback(() => {
        setScrubHintSeen((seen) => {
            if (!seen) void AsyncStorage.setItem(STATS_CHART_SCRUB_HINT_KEY, '1').catch(() => {});
            return true;
        });
    }, []);
    const weeklyBars = useMemo((): StatBar[] => {
        const values = metrics.rhythmDays.map((day) => metric === 'time'
            ? day.minutes
            : day.points);
        const maxValue = Math.max(1, ...values);
        return metrics.rhythmDays.map((day, index): StatBar => {
            const value = values[index] ?? 0;
            return {
                key: day.date,
                ratio: value / maxValue,
                active: value > 0,
                topLabel: metric === 'time'
                    ? (day.minutes > 0 ? humanMinutes(day.minutes, lang) : '')
                    : (day.points > 0 ? `${day.points}` : ''),
                scrubLabel: metric === 'time' ? humanMinutes(day.minutes, lang) : `${day.points} XP`,
                bottomLabel: `${day.shortLabel} ${day.dayNum}`,
                highlight: day.isToday,
            };
        });
    }, [lang, metric, metrics.rhythmDays]);
    const heading = metric === 'time'
            ? humanMinutes(metrics.minutes7, lang)
            : metric === 'xp'
                ? `${metrics.xp7} XP`
                : triLang(lang, {
                    ru: 'Активность за год',
                    uk: 'Активність за рік',
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
            es: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'más' : 'menos'} que los 7 días anteriores`,
            'pt-BR': `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'a mais' : 'a menos'} que nos 7 dias anteriores`,
            vi: `${weekDeltaMinutes > 0 ? 'Nhiều hơn' : 'Ít hơn'} ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} so với 7 ngày trước đó`,
            id: `${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'lebih banyak' : 'lebih sedikit'} dari 7 hari sebelumnya`,
            tr: `Önceki 7 güne göre ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'fazla' : 'az'}`,
            pl: `O ${humanMinutes(Math.abs(weekDeltaMinutes), lang)} ${weekDeltaMinutes > 0 ? 'więcej' : 'mniej'} niż przez poprzednie 7 dni`,
        }));
    }
    return (
      <StatsCardArtSurface testID="stats-primary-analytics" name="practiceBalance" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'practiceBalance')]}>
        {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, minWidth: 0, color: t.textPrimary, fontSize: f.h1, fontWeight: '900' }}>
            {heading}
          </Text>
          <View testID="stats-primary-metric-selector" style={{ flexDirection: 'row', borderRadius: 12, padding: 3, backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet') }}>
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

        <StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="learningCoach" devUnlock={statsDevUnlock}>
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
              inactiveColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsThemeSoftBg(themeMode, 'quiet')}
              todayDotColor={accent}
              height={96}
              topLabelColor={t.textPrimary}
              topLabelMutedColor={t.textGhost}
              bottomLabelColor={t.textPrimary}
              bottomLabelMutedColor={t.textMuted}
              scrubEnabled
              scrubHighlightColor={accent}
              scrubBubbleBg={t.bgCard}
              scrubBubbleBorder={isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance')}
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
                { icon: 'calendar-outline' as const, value: `${metrics.active7} ${triLang(lang, { ru: pluralRu(metrics.active7, 'день', 'дня', 'дней'), uk: 'днів', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}` },
                { icon: 'time-outline' as const, value: humanMinutes(metrics.minutes7, lang) },
                { icon: 'flash-outline' as const, value: `${metrics.xp7} XP` },
            ].map((item) => (<View key={item.icon} style={{ flex: 1, minWidth: 0, minHeight: 68, borderRadius: 15, padding: 9, backgroundColor: isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2, borderWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name={item.icon} size={17} color={accent}/>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}>{item.value}</Text>
            </View>))}
          </View>
          {progressParts.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance') }}>
              <Ionicons name={weekDeltaMinutes !== null && weekDeltaMinutes < 0 ? 'trending-down-outline' : 'trending-up-outline'} size={15} color={t.textMuted} />
              <Text style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.35 }}>
                {progressParts.join(' · ')}
              </Text>
            </View>
          ) : null}
        </>) : null}
        </StatsPremiumBlur>
      </StatsCardArtSurface>
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
    const accent = isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode);
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    const tileBg = isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2;
    const currentXp = Math.max(0, insights.weekComparison.currentXp);
    const previousXp = Math.max(0, insights.weekComparison.previousXp);
    const comparisonMax = Math.max(1, currentXp, previousXp);
    const title = triLang(lang, { ru: 'Все показатели', uk: 'Усі показники', es: 'Todos los datos', 'pt-BR': 'Todos os dados', vi: 'Tất cả chỉ số', id: 'Semua statistik', tr: 'Tüm istatistikler', pl: 'Wszystkie statystyki' });
    const subtitle = triLang(lang, { ru: 'рекорды и сравнение', uk: 'рекорди та порівняння', es: 'récords y comparación', 'pt-BR': 'recordes e comparação', vi: 'kỷ lục và so sánh', id: 'rekor dan perbandingan', tr: 'rekorlar ve karşılaştırma', pl: 'rekordy i porównanie' });
    const bestWeekLabel = triLang(lang, { ru: 'Лучшая неделя', uk: 'Кращий тиждень', es: 'Mejor semana', 'pt-BR': 'Melhor semana', vi: 'Tuần tốt nhất', id: 'Minggu terbaik', tr: 'En iyi hafta', pl: 'Najlepszy tydzień' });
    const seriesTileLabel = triLang(lang, { ru: 'Серия', uk: 'Серія', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rangkaian', tr: 'Seri', pl: 'Seria' });
    const recordWord = triLang(lang, { ru: 'рекорд', uk: 'рекорд', es: 'récord', 'pt-BR': 'recorde', vi: 'kỷ lục', id: 'rekor', tr: 'rekor', pl: 'rekord' });
    const comparisonTitle = triLang(lang, { ru: 'Неделя к прошлой', uk: 'Тиждень до минулого', es: 'Semana vs. anterior', 'pt-BR': 'Semana vs. anterior', vi: 'Tuần so với trước', id: 'Minggu vs. sebelumnya', tr: 'Geçen haftaya göre', pl: 'Tydzień vs. poprzedni' });
    const previousLabel = triLang(lang, { ru: 'прошлая', uk: 'минулий', es: 'anterior', 'pt-BR': 'anterior', vi: 'trước', id: 'sebelumnya', tr: 'önceki', pl: 'poprzedni' });
    const currentLabel = triLang(lang, { ru: 'текущая', uk: 'поточний', es: 'actual', 'pt-BR': 'atual', vi: 'hiện tại', id: 'saat ini', tr: 'şu an', pl: 'bieżący' });
    return (
        <StatsCardArtSurface
          testID="stats-all-metrics-fold"
          name={tone}
          theme={t}
          isGoldTheme={isGoldTheme}
          gradientColors={statsCardGradient(t)}
          gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          radius={cardRadius}
          style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 0, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, tone)]}
        >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            <Pressable onPress={() => { hapticTap(); setOpen((v) => !v); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.92 }]}>
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, tone) }}>
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
                            <Text style={{ color: accent, fontSize: f.bodyLg, fontWeight: '900' }}>{`${insights.bestWeek.xp.toLocaleString('ru-RU')} XP`}</Text>
                        </View>
                        <View style={{ flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2, backgroundColor: tileBg }}>
                            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{seriesTileLabel}</Text>
                            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                                {`${totalStreak} ${pluralRu(totalStreak, 'день', 'дня', 'дней')} · ${recordWord} ${bestStreak}`}
                            </Text>
                        </View>
                    </View>
                    <View style={{ borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, gap: 10, backgroundColor: tileBg }}>
                        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>{comparisonTitle}</Text>
                        <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{previousLabel}</Text>
                                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>{`${previousXp.toLocaleString('ru-RU')} XP`}</Text>
                            </View>
                            <AnimatedFillBar ratio={previousXp / comparisonMax} color={t.textGhost} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : t.bgCard} height={10} barOpacity={0.35} />
                        </View>
                        <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{currentLabel}</Text>
                                <Text style={{ color: accent, fontSize: f.caption, fontWeight: '800' }}>{`${currentXp.toLocaleString('ru-RU')} XP`}</Text>
                            </View>
                            <AnimatedFillBar ratio={currentXp / comparisonMax} color={accent} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : t.bgCard} height={10} delayMs={120} />
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
    const accent = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'multipliers');
    return (<TouchableOpacity testID="stats-recent-achievements" activeOpacity={0.84} onPress={onPress} style={{ paddingHorizontal: 2, paddingVertical: 8, backgroundColor: 'transparent' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
            {triLang(lang, { ru: 'Последние достижения', uk: 'Останні досягнення', es: 'Últimos logros', 'pt-BR': 'Últimas conquistas', vi: 'Thành tích mới nhất', id: 'Pencapaian terbaru', tr: 'Son başarılar', pl: 'Ostatnie osiągnięcia' })}
          </Text>
          {/* зачем: при нуле счётчик прячем — «Все 0» в первый день демотивирует
              (интент снятого легаси-блока ruAchievementRewardPhrase); высота ряда
              задаётся заголовком, геометрия при появлении числа не прыгает. */}
          {achievementCount > 0 ? (
            <Text style={{ color: accent, fontSize: f.caption, fontWeight: '900' }}>
              {triLang(lang, { ru: `Все ${achievementCount}`, uk: `Усі ${achievementCount}`, es: `Todos ${achievementCount}`, 'pt-BR': `Todas ${achievementCount}`, vi: `Tất cả ${achievementCount}`, id: `Semua ${achievementCount}`, tr: `Tümü ${achievementCount}`, pl: `Wszystkie ${achievementCount}` })}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingLeft: 2 }}>
          {(latest.length > 0 ? latest : [null, null, null, null]).map((achievement, index) => (
            <View key={achievement?.id ?? `empty-${index}`} accessibilityLabel={achievement ? achievementNameForLang(achievement, lang) : undefined} style={{ width: 58, height: 58, marginLeft: index === 0 ? 0 : -9, zIndex: 10 - index, backgroundColor: 'transparent', borderWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
              {achievement
                ? <AchievementArt achievementId={achievement.id} size={58} fallbackIconName="trophy" tintColor={t.textGhost} iconColor={t.bgPrimary} />
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
    const { theme: t, f, isDark, themeMode } = useTheme();
    const isLightTheme = false;
    const isGoldTheme = themeMode === 'gold';
    const purpleColor = isGoldTheme ? GOLD_RICH.paleGold : isDark ? '#9B59F5' : '#6B21D4';
    const { lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const wdays = streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY);
    // Initialise from pre-loaded cache so the screen shows real data immediately
    const _sc = getStatsCache(studyTarget);
    const [statsReady, setStatsReady] = useState(_sc.loaded);
    const [days, setDays] = useState<DayData[]>(() => labelCachedDayRows(_sc.days, wdays));
    const [allDays, setAllDays] = useState<DayData[]>(() => labelCachedDayRows(_sc.allDays, wdays));
    const [allTimeDays, setAllTimeDays] = useState<TimeDayData[]>(() => labelCachedTimeDayRows(_sc.allTimeDays, wdays));
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
    const [totalXP, setTotalXP] = useState(_sc.totalXP);
    const [, setActiveDays] = useState(_sc.activeDays);
    const [weekPoints, setWeekPoints] = useState(_sc.weekPoints);
    const [, setMyName] = useState(_sc.myName);
    const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[number]>(() => LEAGUES.find(l => l.id === (_sc.engineLeagueId != null ? _sc.engineLeagueId : 0)) ?? LEAGUES[0]);
    const { hasPremiumAccess: isPremium } = usePremium();
    /** Тестер «Снять премиум»: иначе devUnlock ниже перекрывает блюр, хотя isPremium уже false. */
    const [testerStripsPremium, setTesterStripsPremium] = useState<boolean | null>(() => (ENABLE_DEV_TOOLS ? null : false));
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void AsyncStorage.getItem('tester_no_premium').then((v) => {
            if (!cancelled)
                setTesterStripsPremium(v === 'true');
        }).catch(() => {
            if (!cancelled)
                setTesterStripsPremium(true);
        });
        return () => { cancelled = true; };
    }, []));
    /** В dev-сборках без «магазинного» флага — снимаем блюр и открываем «Весь путь». Не при симуляции бесплатного. */
    const statsDevUnlock = shouldDevUnlockStatsPremiumContent(ENABLE_DEV_TOOLS, testerStripsPremium);
    const [freezeActive, setFreezeActive] = useState(_sc.freezeActive);
    const [streakAtRisk, setStreakAtRisk] = useState(_sc.streakAtRisk);
    const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(_sc.premiumFreezeUsed);
    const [comebackActive, setComebackActive] = useState(_sc.comebackActive);
    const [clubBoostMultiplier, setClubBoostMultiplier] = useState(_sc.clubBoostMultiplier);
    // stationary_clubs feature удалён, мультипликатор фиксирован 1.
    const stationaryClubMultiplier = 1;
    const [clubBoostExpiresAt, setClubBoostExpiresAt] = useState(_sc.clubBoostExpiresAt);
    const [shardsBalance, setShardsBalance] = useState(_sc.shardsBalance);
    const [clubBoostTimeLeft, setClubBoostTimeLeft] = useState('');
    const [leagueBoostMultiplier, setLeagueBoostMultiplier] = useState(1);
    const [leagueBoostExpiresAt, setLeagueBoostExpiresAt] = useState(0);
    const [leagueBoostTimeLeft, setLeagueBoostTimeLeft] = useState('');
    const [leagueGroupBoostMultiplier, setLeagueGroupBoostMultiplier] = useState(1);
    const [leagueGroupBoostExpiresAt, setLeagueGroupBoostExpiresAt] = useState(0);
    const [leagueGroupBoostTimeLeft, setLeagueGroupBoostTimeLeft] = useState('');
    const [giftMultiplier, setGiftMultiplier] = useState(_sc.giftMultiplier);
    const [giftExpiresAt, setGiftExpiresAt] = useState(_sc.giftExpiresAt);
    const [giftXpBankRemaining, setGiftXpBankRemaining] = useState(_sc.giftXpBankRemaining);
    const [giftTimeLeft, setGiftTimeLeft] = useState('');
    const [chainShieldDays, setChainShieldDays] = useState(_sc.chainShieldDays);
    const [, setHadPremiumEver] = useState(_sc.hadPremiumEver);
    // зачем: peek-кэш вместо 0 по умолчанию — иначе «Все 0» на каждом открытии
    // экрана до ответа loadAchievementStates() (см. achievementCountPeek выше).
    const [achievementCount, setAchievementCount] = useState(() => achievementCountPeek ?? 0);
    const [recentAchievementIds, setRecentAchievementIds] = useState<string[]>(() => recentAchievementIdsPeek ?? []);
    // зачем: MemoryGauge/CefrLine — то же правило «первый кадр = финальные
    // числа», что и achievementCount выше (см. journalMemorySnapshotPeek).
    const [journalMemory, setJournalMemory] = useState<JournalMemorySnapshot>(
        () => journalMemorySnapshotPeek ?? { totalTracked: 0, masteredCount: 0, masteredPhraseCount: 0, dueToday: 0 },
    );
    const [pendingGiftCount, setPendingGiftCount] = useState(_sc.pendingGiftCount);
    const [spinBalance, setSpinBalance] = useState(0);
    const spinButtonPulse = useSharedValue(1);
    const spinButtonPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: spinButtonPulse.value }] }));
    const [freezeConfirmVisible, setFreezeConfirmVisible] = useState(false);
    const [freezeNeedShardsModal, setFreezeNeedShardsModal] = useState(false);
    const [reviveOffer, setReviveOffer] = useState<StreakReviveOffer | null>(null);
    const [reviveModalVisible, setReviveModalVisible] = useState(false);
    // Свёрнут по умолчанию: таблица источников — справка, а не ежедневная ценность.
    const [bonusOpen, setBonusOpen] = useState(false);
    const [seriesOpen, setSeriesOpen] = useState(false);
    const [wagerOpen, setWagerOpen] = useState(false);
    const [wagerPickerOpen, setWagerPickerOpen] = useState(false);
    const [comparisonOpen, setComparisonOpen] = useState(true);
    // зачем: lazy-инициализатор читает primaryMetricPeek синхронно на первом кадре
    // (см. комментарий у объявления peek выше) — устраняет вспышку дефолтной
    // вкладки перед переключением на последнюю сохранённую (Perf Bible: instant
    // first frame, no default-then-patch).
    const [primaryMetric, setPrimaryMetric] = useState<StatsPrimaryMetric>(() => primaryMetricPeek ?? DEFAULT_STATS_PRIMARY_METRIC);
    const FREEZE_COST_SHARDS = 10;
    const refreshReviveOffer = useCallback(async () => {
        const offer = await getReviveOffer();
        setReviveOffer(offer);
        return offer;
    }, []);
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void getReviveOffer().then((offer) => {
            if (!cancelled)
                setReviveOffer(offer);
        }).catch(() => {
            if (!cancelled)
                setReviveOffer(null);
        });
        return () => { cancelled = true; };
    }, []));
    useEffect(() => {
        const sub = onAppEvent('streak_revive_offer', () => {
            void refreshReviveOffer();
        });
        const revivedSub = onAppEvent('streak_revived', () => {
            setReviveOffer(null);
            setReviveModalVisible(false);
        });
        return () => {
            sub.remove();
            revivedSub.remove();
        };
    }, [refreshReviveOffer]);
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
    // зачем: MemoryGauge/CefrLine (журнал) — getTrainerDashboard читает только
    // локальный AsyncStorage тренажёра (уже используется на других экранах:
    // signal_bus, trainer_practice_prefetch, weekly_review_briefing), НИКАКИХ
    // новых чтений Firestore. words+phrases — та же выборка, что
    // и trainerPracticeDue в statsCache, для согласованности «фраз под риском».
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void getTrainerDashboard(studyTarget)
            .then((dash) => {
                if (cancelled) return;
                const snapshot: JournalMemorySnapshot = {
                    totalTracked: dash.totalTracked,
                    masteredCount: dash.archived,
                    masteredPhraseCount: dash.archivedPhrases,
                    dueToday: dash.due.words + dash.due.phrases,
                };
                journalMemorySnapshotPeek = snapshot;
                setJournalMemory(snapshot);
            })
            .catch(() => {
                // Peek уже наполнен — оставляем последнее известное состояние
                // вместо отката к нулям (тот же принцип, что и achievementCount).
            });
        return () => { cancelled = true; };
    }, [studyTarget]));
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
            .catch(() => {
            // Keep the safe default when the preference cannot be read.
        });
        return () => { cancelled = true; };
    }, [studyTarget]);
    const selectPrimaryMetric = useCallback((nextMetric: StatsPrimaryMetric) => {
        // зачем: обновляем peek синхронно с тапом — следующее открытие экрана
        // в этой сессии стартует сразу с этой вкладкой, без ожидания AsyncStorage.
        primaryMetricPeek = nextMetric;
        setPrimaryMetric(nextMetric);
        void AsyncStorage.setItem(statsPrimaryMetricKey(studyTarget), nextMetric).catch(() => {
            // The selection still works for this visit when persistence is unavailable.
        });
    }, [studyTarget]);
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        const spinAccountToken = captureAccountGeneration();
        const spinOwner = spinAccountToken.stableId;
        const readSpinBalance = () => spinOwner && isCurrentAccountGeneration(spinAccountToken, spinOwner)
            ? readLocalLevelSpinBalance()
            : Promise.resolve(null);
        void Promise.all([readPendingLevelGiftCountCache(), readSpinBalance()])
            .then(([legacyPendingGiftCount, cachedSpinBalance]) => {
            const spinBalance = spinOwner && isCurrentAccountGeneration(spinAccountToken, spinOwner)
                ? Math.max(0, Math.floor(cachedSpinBalance ?? 0))
                : 0;
            if (!cancelled) setSpinBalance(spinBalance);
            if (!cancelled && isCurrentAccountGeneration(spinAccountToken, spinOwner) && legacyPendingGiftCount + spinBalance > 0)
                setPendingGiftCount(legacyPendingGiftCount + spinBalance);
        })
            .catch(() => { });
        void Promise.all([loadPendingLevelGiftCount(), readSpinBalance()])
            .then(([legacyPendingGiftCount, cachedSpinBalance]) => {
            const spinBalance = spinOwner && isCurrentAccountGeneration(spinAccountToken, spinOwner)
                ? Math.max(0, Math.floor(cachedSpinBalance ?? 0))
                : 0;
            if (!cancelled) setSpinBalance(spinBalance);
            if (!cancelled && isCurrentAccountGeneration(spinAccountToken, spinOwner))
                setPendingGiftCount(legacyPendingGiftCount + spinBalance);
        })
            .catch(() => {
            // Keep the last known value on transient storage errors to avoid a visible zero flash.
        });
        return () => { cancelled = true; };
    }, []));
    useEffect(() => {
        const subscription = onAppEvent('level_spin_balance_changed', () => {
            void readLocalLevelSpinBalance().then(setSpinBalance).catch(() => {});
        });
        return () => subscription.remove();
    }, []);
    useEffect(() => {
        cancelAnimation(spinButtonPulse);
        spinButtonPulse.value = statsRuntimeActive && spinBalance > 0
            ? withRepeat(withSequence(withTiming(1.07, { duration: 650 }), withTiming(1, { duration: 650 })), -1, true)
            : 1;
        return () => cancelAnimation(spinButtonPulse);
    }, [spinBalance, spinButtonPulse, statsRuntimeActive]);
    const scrollRef = useRef<any>(null);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const chartScrollRef = useRef<any>(null);
    /** «Опыт» | «Время» — один блок графика по дням. */
    const [dailyChartTab, setDailyChartTab] = useState<'xp' | 'time'>('xp');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const today = toDateStr(new Date());
    const [lifetimeStats, setLifetimeStats] = useState<LifetimeProfileStats | null>(null);
    const [percentiles, setPercentiles] = useState<AllPercentiles>({ xp: null, streak: null, weekXp: null, daily7xp: null, daily7timeMs: null, totalUsers: 0 });
    const [myXp7, setMyXp7] = useState(0);
    const [myTime7ms, setMyTime7ms] = useState(0);
    const coachMetrics = useMemo(() => buildLearningCoachMetrics(allDays.length > 0 ? allDays : days, allTimeDays, totalStreak, lang), [allDays, days, allTimeDays, totalStreak, lang]);
    const learningInsights = useMemo(() => {
        const timeByDate = new Map(allTimeDays.map((day) => [day.date, day.ms]));
        return buildStatsLearningInsights((allDays.length > 0 ? allDays : days).map((day) => ({
            date: day.date,
            xp: day.points,
            foregroundMs: timeByDate.get(day.date) ?? 0,
            active: day.active,
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
            .catch(() => {
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
        setDays(labelCachedDayRows(snapshot.days, wdays));
        setAllDays(labelCachedDayRows(snapshot.allDays, wdays));
        setAllTimeDays(labelCachedTimeDayRows(snapshot.allTimeDays, wdays));
        setTotalStreak(snapshot.totalStreak);
        setBestStreak(snapshot.bestStreak);
        setTotalXP(snapshot.totalXP);
        setActiveDays(snapshot.activeDays);
        setWeekPoints(snapshot.weekPoints);
        setMyName(snapshot.myName);
        setEngineLeague(LEAGUES.find(l => l.id === (snapshot.engineLeagueId ?? 0)) ?? LEAGUES[0]);
        setFreezeActive(snapshot.freezeActive);
        setPremiumFreezeUsed(snapshot.premiumFreezeUsed);
        setStreakAtRisk(snapshot.streakAtRisk);
        setComebackActive(snapshot.comebackActive);
        setClubBoostMultiplier(snapshot.clubBoostMultiplier);
        setClubBoostExpiresAt(snapshot.clubBoostExpiresAt);
        setShardsBalance(snapshot.shardsBalance);
        setGiftMultiplier(snapshot.giftMultiplier);
        setGiftExpiresAt(snapshot.giftExpiresAt);
        setGiftXpBankRemaining(snapshot.giftXpBankRemaining);
        setChainShieldDays(snapshot.chainShieldDays);
        setHadPremiumEver(snapshot.hadPremiumEver);
        setPendingGiftCount(snapshot.pendingGiftCount);
    }, [wdays]);
    const loadAll = React.useCallback(async () => {
        debugStatsRoute('loadAll:start');
        await hydrateStatsCacheFromStorage();
        const cachedSnapshot = getStatsCache(studyTarget);
        debugStatsRoute('loadAll:cache', { loaded: cachedSnapshot.loaded });
        if (cachedSnapshot.loaded)
            applyStatsSnapshot(cachedSnapshot);
        const snapshot = await refreshStatsCache(studyTarget);
        debugStatsRoute('loadAll:refreshStatsCache', { ok: !!snapshot });
        if (snapshot)
            applyStatsSnapshot(snapshot);
        const activeLeagueBoost = await loadActiveLeagueBoost().catch(() => null);
        debugStatsRoute('loadAll:leagueBoost', { ok: !!activeLeagueBoost });
        setLeagueBoostMultiplier(activeLeagueBoost?.multiplier ?? 1);
        setLeagueBoostExpiresAt(activeLeagueBoost?.expiresAt ?? 0);
        const activeLeagueGroupBoost = await getActiveLeagueGroupBoost().catch(() => null);
        debugStatsRoute('loadAll:leagueGroupBoost', { ok: !!activeLeagueGroupBoost });
        setLeagueGroupBoostMultiplier(activeLeagueGroupBoost?.multiplier ?? 1);
        setLeagueGroupBoostExpiresAt(activeLeagueGroupBoost?.expiresAt ?? 0);
        loadWeeklyLearnedCounts(studyTarget)
            .then((counts) => setWeekLearned(counts))
            .catch(() => setWeekLearned(null));
        // Синк аналитики + перцентиль (не блокирует рендер — запускаем после основной загрузки)
        void syncDailyAnalyticsIfNeeded();
        loadPercentileData().then(({ myXp7: x7, myTime7ms: t7, percentiles: p }) => {
            debugStatsRoute('loadAll:percentiles', { x7, t7, xp: p.xp, weekXp: p.weekXp, daily7xp: p.daily7xp, daily7timeMs: p.daily7timeMs });
            setMyXp7(x7);
            setMyTime7ms(t7);
            setPercentiles(p);
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
            percentiles: {
                xp: percentiles.xp,
                streak: percentiles.streak,
                weekXp: percentiles.weekXp,
                daily7xp: percentiles.daily7xp,
                daily7timeMs: percentiles.daily7timeMs,
            },
            myXp7,
            myTime7ms,
            detailsOpen,
            bonusOpen,
            statsDevUnlock,
            isPremium,
        });
    }, [allDays.length, allTimeDays.length, bonusOpen, days.length, detailsOpen, isPremium, lifetimeStats, myTime7ms, myXp7, percentiles.daily7timeMs, percentiles.daily7xp, percentiles.streak, percentiles.weekXp, percentiles.xp, statsDevUnlock, statsReady]);
    useEffect(() => {
        const sub = onAppEvent('xp_changed', () => {
            requestStatsRefresh();
        });
        return () => sub.remove();
    }, [requestStatsRefresh]);
    const countdownExpiries = [
        clubBoostMultiplier > 1 ? clubBoostExpiresAt : 0,
        leagueBoostMultiplier > 1 ? leagueBoostExpiresAt : 0,
        leagueGroupBoostMultiplier > 1 ? leagueGroupBoostExpiresAt : 0,
        giftMultiplier > 1 ? giftExpiresAt : 0,
    ].filter((expiresAt): expiresAt is number => typeof expiresAt === 'number' && expiresAt > 0);
    const soonestCountdownMs = countdownExpiries.length > 0
        ? Math.min(...countdownExpiries) - Date.now()
        : Number.POSITIVE_INFINITY;
    const boostCountdownActive = statsRuntimeActive && soonestCountdownMs > 0;
    const boostNow = useVisibleWallClock(
        boostCountdownActive,
        soonestCountdownMs < 3_600_000 ? 1_000 : 30_000,
    );
    // One shared visible wall clock for all active boost rows on this screen.
    useEffect(() => {
        const updateBoostCountdowns = () => {
            let hasActiveCountdown = false;

            if (!clubBoostExpiresAt || clubBoostMultiplier <= 1) {
                setClubBoostTimeLeft('');
            }
            else {
                const ms = clubBoostExpiresAt - boostNow;
                if (ms <= 0) {
                    setClubBoostTimeLeft('');
                    setClubBoostMultiplier(1);
                }
                else {
                    hasActiveCountdown = true;
                    setClubBoostTimeLeft(formatStatsBoostTimeLeft(ms, lang));
                }
            }

            if (!leagueBoostExpiresAt || leagueBoostMultiplier <= 1) {
                setLeagueBoostTimeLeft('');
            }
            else {
                const ms = leagueBoostExpiresAt - boostNow;
                if (ms <= 0) {
                    setLeagueBoostTimeLeft('');
                    setLeagueBoostMultiplier(1);
                }
                else {
                    hasActiveCountdown = true;
                    setLeagueBoostTimeLeft(formatStatsBoostTimeLeft(ms, lang));
                }
            }

            if (!leagueGroupBoostExpiresAt || leagueGroupBoostMultiplier <= 1) {
                setLeagueGroupBoostTimeLeft('');
            }
            else {
                const ms = leagueGroupBoostExpiresAt - boostNow;
                if (ms <= 0) {
                    setLeagueGroupBoostTimeLeft('');
                    setLeagueGroupBoostMultiplier(1);
                }
                else {
                    hasActiveCountdown = true;
                    setLeagueGroupBoostTimeLeft(formatLeagueGroupBoostTimeLeft(leagueGroupBoostExpiresAt));
                }
            }

            if (!giftExpiresAt || giftMultiplier <= 1) {
                setGiftTimeLeft('');
            }
            else {
                const ms = giftExpiresAt - boostNow;
                if (ms <= 0) {
                    setGiftTimeLeft('');
                    setGiftMultiplier(1);
                }
                else {
                    hasActiveCountdown = true;
                    setGiftTimeLeft(formatStatsBoostTimeLeft(ms, lang));
                }
            }

            return hasActiveCountdown;
        };

        updateBoostCountdowns();
        // Секундный тик ререндерит весь экран — держим его только когда в строке
        // реально видны секунды (< 1 часа до конца буста), иначе хватает раз в 30с.
    }, [
        lang,
        clubBoostExpiresAt,
        clubBoostMultiplier,
        leagueBoostExpiresAt,
        leagueBoostMultiplier,
        leagueGroupBoostExpiresAt,
        leagueGroupBoostMultiplier,
        giftExpiresAt,
        giftMultiplier,
        boostNow,
    ]);
    const handleFreezeStreak = () => {
        hapticTap();
        if (!isPremium) {
            router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(totalStreak) } } as any);
            return;
        }
        if (premiumFreezeUsed) {
            setFreezeConfirmVisible(true);
        }
        else {
            doFreezeStreak(true);
        }
    };
    const handleReviveStreak = async () => {
        hapticTap();
        const offer = await refreshReviveOffer();
        if (offer) {
            setReviveModalVisible(true);
            return;
        }
        emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Восстановление уже недоступно.',
            messageUk: 'Відновлення вже недоступне.',
            messageEs: 'La recuperación ya no está disponible.',
            messagePtBr: 'A restauração já não está disponível.',
            messageVi: 'Khôi phục không còn khả dụng.',
            messageId: 'Pemulihan tidak tersedia lagi.',
            messageTr: 'Yenileme artık kullanılamıyor.',
            messagePl: 'Odnowienie nie jest już dostępne.',
        });
    };
    const doFreezeStreak = async (free: boolean) => {
        const today = toDateStr(new Date());
        if (free) {
            await AsyncStorage.setItem('premium_free_freeze_used', 'true');
            setPremiumFreezeUsed(true);
        }
        else {
            const ok = await spendShards(FREEZE_COST_SHARDS, 'streak_freeze');
            if (!ok) {
                setFreezeNeedShardsModal(true);
                return;
            }
            setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
        }
        await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
        setFreezeActive(true);
        emitAppEvent('streak_freeze_updated', { active: true });
        setStreakAtRisk(false);
        // Ежедневное задание «Щит стрика»: ручная заморозка (бесплатная или за осколки).
        void updateTaskProgress('streak_freeze_use', 1, studyTarget).catch(() => {});
    };
    const weekAnalyticsBlock = (
        <Reanimated.View key="week-analytics" entering={FadeInDown.duration(420).delay(210)}>
          <WeekAnalyticsCard
            t={t}
            f={f}
            lang={lang}
            metrics={coachMetrics}
            isGoldTheme={isGoldTheme}
            themeMode={themeMode}
            isPremium={isPremium}
            statsDevUnlock={statsDevUnlock}
            weekDeltaMinutes={weekDeltaMinutes}
            metric={primaryMetric}
            onSelectMetric={selectPrimaryMetric}
          />
        </Reanimated.View>
    );
    const percentilesBlock = (() => {
        const pItems: {
            icon: keyof typeof Ionicons.glyphMap;
            color: string;
            label: string;
            percent: number;
        }[] = [];
        const xp = visiblePercentile(percentiles.xp);
        const xp7 = visiblePercentile(percentiles.daily7xp, myXp7 > 0);
        const time7 = visiblePercentile(percentiles.daily7timeMs, myTime7ms > 0);
        if (xp !== null) pItems.push({
            icon: 'trophy-outline',
            color: isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'multipliers'),
            percent: xp,
            label: triLang(lang, { ru: 'Суммарный опыт', uk: 'Сумарний досвід', es: 'XP total', 'pt-BR': 'XP total', vi: 'Tổng XP', id: 'Total XP', tr: 'Toplam XP', pl: 'Łączne XP' }),
        });
        if (xp7 !== null) pItems.push({
            icon: 'trending-up-outline',
            color: isGoldTheme ? GOLD_RICH.antiqueGold : statsAccent(themeMode, 'percentiles'),
            percent: xp7,
            label: triLang(lang, { ru: 'Опыт за 7 дней', uk: 'Досвід за 7 днів', es: 'XP en 7 días', 'pt-BR': 'XP em 7 dias', vi: 'XP trong 7 ngày', id: 'XP 7 hari', tr: '7 günde XP', pl: 'XP w 7 dni' }),
        });
        if (time7 !== null) pItems.push({
            icon: 'time-outline',
            color: isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'freeze'),
            percent: time7,
            label: triLang(lang, { ru: 'Время за 7 дней', uk: 'Час за 7 днів', es: 'Tiempo en 7 días', 'pt-BR': 'Tempo em 7 dias', vi: 'Thời gian 7 ngày', id: 'Waktu 7 hari', tr: '7 günde süre', pl: 'Czas w 7 dni' }),
        });
        if (pItems.length === 0 && (isPremium || statsDevUnlock)) return null;
        if (pItems.length === 0) {
          return (
            <Reanimated.View key="percentiles-locked" entering={FadeInDown.duration(420).delay(420)}>
              <StatsPremiumBlur isPremium={isPremium} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
                <View />
              </StatsPremiumBlur>
            </Reanimated.View>
          );
        }
        return (
          <Reanimated.View key="percentiles" entering={FadeInDown.duration(420).delay(420)}>
          <StatsPremiumBlur isPremium={isPremium} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
            <StatsCardArtSurface testID="stats-comparison-content" name="percentiles" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 16, borderWidth: 0, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'percentiles') : null]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Среди других', uk: 'Серед інших', es: 'Entre otros', 'pt-BR': 'Entre outros', vi: 'So với người khác', id: 'Di antara yang lain', tr: 'Diğerleri arasında', pl: 'Na tle innych' })}
                </Text>
                {!isPremium && <PlusBadge themeMode={themeMode} size="xs"/>}
              </View>
              {(() => {
                  const bestItem = pItems.reduce((best, item) => (item.percent > best.percent ? item : best));
                  const topN = Math.max(1, 100 - bestItem.percent);
                  return (
                    <View style={{ marginBottom: 14, gap: 2 }}>
                      <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode), fontSize: f.numLg, fontWeight: '900' }}>
                        {`${triLang(lang, { ru: 'Топ', uk: 'Топ', es: 'Top', 'pt-BR': 'Top', vi: 'Top', id: 'Top', tr: 'Top', pl: 'Top' })}‑${topN}%`}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{bestItem.label}</Text>
                    </View>
                  );
              })()}
              <View style={{ gap: 16 }}>
                {pItems.map((item, idx) => (
                  <StatProgressRow key={item.label} percent={item.percent} label={item.label} icon={item.icon} accent={item.color} accentSoft={item.color + 'AA'} trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsSoftBg(themeMode, 'percentiles', 'quiet')} iconChipBg={item.color + '24'} labelColor={t.textPrimary} valueColor={item.color} delayMs={120 + idx * 110}/>
                ))}
              </View>
            </StatsCardArtSurface>
          </StatsPremiumBlur>
          </Reanimated.View>
        );
    })();
    return (<View style={{ flex: 1, backgroundColor: statsPageField(themeMode) }}>
    <StatsArtBackdrop />
    <SafeAreaView testID="screen-streak-stats" style={{ flex: 1 }}>

      {/* Подтверждение траты осколков на заморозку */}
      <Modal transparent visible={freezeConfirmVisible} animationType="fade" onRequestClose={() => setFreezeConfirmVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFreezeConfirmVisible(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', borderWidth: 0, borderColor: t.border }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>❄️</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {triLang(lang, {
            ru: 'Заморозить цепочку?',
            uk: 'Заморозити ланцюжок?',
            es: '¿Congelar la racha?',
            'pt-BR': "Congelar a sequência?",
            vi: "Đóng băng chuỗi?",
            id: "Bekukan rangkaian?",
            tr: "Seri dondurulsun mu?",
            pl: "Zamrozić serię?",
        })}
            </Text>
            <View style={{ alignItems: 'center', marginBottom: 20, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, {
            ru: 'Стоимость:',
            uk: 'Вартість:',
            es: 'Coste:',
            'pt-BR': "Custo:",
            vi: "Chi phí:",
            id: "Biaya:",
            tr: "Maliyet:",
            pl: "Koszt:",
        })}</Text>
                <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted}/>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, {
            ru: 'Баланс:',
            uk: 'Баланс:',
            es: 'Saldo:',
            'pt-BR': "Saldo:",
            vi: "Số dư:",
            id: "Saldo:",
            tr: "Bakiye:",
            pl: "Saldo:",
        })}</Text>
                <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted}/>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setFreezeConfirmVisible(false)} style={{ flex: 1, borderRadius: 14, borderWidth: 0, borderColor: statsHairline(themeMode, 'freeze'), paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body }}>
                  {triLang(lang, {
            ru: 'Отмена',
            uk: 'Скасувати',
            es: 'Cancelar',
            'pt-BR': "Cancelar",
            vi: "Hủy",
            id: "Batal",
            tr: "İptal",
            pl: "Anuluj",
        })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.75} onPress={() => { setFreezeConfirmVisible(false); doFreezeStreak(false); }} style={{ flex: 1, borderRadius: 14, backgroundColor: isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'freeze'), paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, {
            ru: 'Заморозить',
            uk: 'Заморозити',
            es: 'Congelar',
            'pt-BR': "Congelar",
            vi: "Đóng băng",
            id: "Bekukan",
            tr: "Dondur",
            pl: "Zamroź",
        })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ContentWrap>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
      <View style={{ paddingHorizontal: 15, paddingTop: embedded ? 4 : (Platform.OS === 'android' ? 28 : 15), paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {!embedded && (<TapScale
          onPress={() => {
            safeRouterBack(router, '/(tabs)/home' as any);
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TapScale>)}
        <FlowText
          testID="stats-header-title"
          provenance="authored"
          style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginLeft: embedded ? 0 : 8, flex: 1 }}
        >
          {triLang(lang, {
            ru: 'Твои результаты',
            uk: 'Твої результати',
            es: 'Tus resultados',
            'pt-BR': "Seus resultados",
            vi: "Kết quả của bạn",
            id: "Hasilmu",
            tr: "Sonuçların",
            pl: "Twoje wyniki",
        })}
        </FlowText>
        <Reanimated.View style={spinButtonPulseStyle}>
        <TouchableOpacity
          testID="stats-header-spins"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: `Спины: ${spinBalance}`, uk: `Спіни: ${spinBalance}`, es: `Giros: ${spinBalance}`, 'pt-BR': `Giros: ${spinBalance}`, vi: `Lượt: ${spinBalance}`, id: `Putaran: ${spinBalance}`, tr: `Çevirmeler: ${spinBalance}`, pl: `Spiny: ${spinBalance}` })}
          activeOpacity={0.82}
          onPress={() => { hapticTap(); router.push('/level_reward_spin' as any); }}
          style={[{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden', borderWidth: 0 }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'streak')]}
        >
          <LinearGradient colors={statsCardGradient(t)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}/>
          <Ionicons name="sync-outline" size={20} color={spinBalance > 0 ? (isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode)) : t.textMuted}/>
          {spinBalance > 0 ? (
            <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode) }}>
              <Text style={{ color: t.bgCard, fontSize: 9, fontWeight: '900' }}>{spinBalance}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        </Reanimated.View>
        <TouchableOpacity
          testID="stats-header-gifts"
          accessibilityHint={triLang(lang, {
            ru: ruGiftPhrase(pendingGiftCount),
            uk: ukGiftPhrase(pendingGiftCount),
            es: pendingGiftCount > 0 ? `${pendingGiftCount} regalo${pendingGiftCount === 1 ? '' : 's'}` : 'Regalos',
            'pt-BR': pendingGiftCount > 0 ? `${pendingGiftCount} presente${pendingGiftCount === 1 ? '' : 's'}` : 'Presentes',
            vi: pendingGiftCount > 0 ? `${pendingGiftCount} quà` : 'Quà',
            id: pendingGiftCount > 0 ? `${pendingGiftCount} hadiah` : 'Hadiah',
            tr: pendingGiftCount > 0 ? `${pendingGiftCount} hediye` : 'Hediyeler',
            pl: pendingGiftCount > 0 ? `${pendingGiftCount} ${pendingGiftCount === 1 ? 'prezent' : 'prezentów'}` : 'Prezenty',
          })}
          activeOpacity={0.82}
          onPress={() => {
            hapticTap();
            router.push('/level_gifts_inventory' as any);
          }}
          style={[{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 10, overflow: 'hidden', borderWidth: 0 }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'streak')]}
        >
          <LinearGradient colors={statsCardGradient(t)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}/>
          <Ionicons name="gift-outline" size={20} color={pendingGiftCount > 0 ? (isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode)) : t.textMuted}/>
          {pendingGiftCount > 0 ? (
            <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: isGoldTheme ? GOLD_RICH.champagne : statsThemeAccent(themeMode) }}>
              <Text style={{ color: t.bgCard, fontSize: 9, fontWeight: '900' }}>{pendingGiftCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        </View>
      </View>

      {/* зачем: раньше при statsReady=false ScrollView рендерился с opacity:0 —
          первый кадр был полностью пустым (только шапка), а весь контент
          «впрыгивал» целиком, когда loadAll() догружался. Держим геометрию
          загруженного экрана скелетоном (шапка героя, XP-карта, недельный
          график, ряд достижений), как в app/review.tsx ~1300. */}
      {!statsReady ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16, gap: 12 }}>
          <SkeletonBlock width="100%" height={200} borderRadius={22} />
          <SkeletonBlock width="100%" height={168} borderRadius={22} />
          <SkeletonBlock width="100%" height={92} borderRadius={22} />
          <SkeletonBlock width="100%" height={230} borderRadius={22} />
          <SkeletonBlock width="100%" height={90} borderRadius={22} />
        </View>
      ) : null}
      <BouncyWrap>
      <Reanimated.ScrollView ref={scrollRef} decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" pointerEvents={statsReady ? 'auto' : 'none'} style={{ opacity: statsReady ? 1 : 0 }} contentContainerStyle={{ padding: 16, paddingBottom: embedded ? 140 : 16 }} showsVerticalScrollIndicator={false} onScroll={onAnimatedScroll} scrollEventThrottle={16}>
        <View style={{ gap: 12 }}>
        <Reanimated.View entering={FadeInDown.duration(420).delay(0)}>
          <StatsCardArtSurface
            testID="journal-memory-card"
            name="practiceBalance"
            theme={t}
            isGoldTheme={isGoldTheme}
            gradientColors={statsCardGradient(t)}
            gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
            radius={statsSurfaceRadius(themeMode, 22)}
            scrim="stats"
            style={[
              { borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 0, overflow: 'hidden', gap: 10 },
              isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'practiceBalance'),
            ]}
          >
            {isGoldTheme ? <GoldBevel radius={16} intensity="normal" /> : null}
            <CefrLine
              t={t}
              f={f}
              lang={lang}
              themeMode={themeMode}
              isGoldTheme={isGoldTheme}
              masteredPhraseCount={journalMemory.masteredPhraseCount}
            />
          </StatsCardArtSurface>
        </Reanimated.View>
        <Reanimated.View entering={FadeInDown.duration(420).delay(70)}>
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
            chainShieldDays={chainShieldDays}
            streakAtRisk={streakAtRisk}
            reviveOffer={reviveOffer}
            seriesOpen={seriesOpen}
            onToggleSeries={() => {
              hapticTap();
              setSeriesOpen(value => !value);
            }}
            onFreezeStreak={handleFreezeStreak}
            onReviveStreak={handleReviveStreak}
            onOpenWager={() => {
              hapticTap();
              // Нет активного пари и результата — сразу окно размещения ставки;
              // иначе — лист с активной/результатной карточкой.
              void loadWager().then((currentWager) => {
                const hasCard = !!currentWager && (currentWager.active || currentWager.result !== 'pending');
                if (hasCard) setWagerOpen(true);
                else setWagerPickerOpen(true);
              });
            }}
            freezeShardCost={FREEZE_COST_SHARDS}
          />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(420).delay(140)}>
          <XpLevelCard
            t={t}
            f={f}
            lang={lang}
            themeMode={themeMode}
            isGoldTheme={isGoldTheme}
            totalXP={totalXP}
            weekXP={coachMetrics.xp7}
          />
        </Reanimated.View>

        {(isPremium || statsDevUnlock) ? weekAnalyticsBlock : null}

        <Reanimated.View entering={FadeInDown.duration(420).delay(280)}>
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
        </Reanimated.View>

        {/* зачем: пока достижений нет ни одного — раздел скрыт целиком (заголовок и
            ряд пустых кубков). Четыре серые заглушки в первый день выглядели как
            «ты ничего не добился», а не как цель. Появляется сразу с первым. */}
        {achievementCount > 0 ? (
        <Reanimated.View entering={FadeInDown.duration(420).delay(350)}>
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

        {!(isPremium || statsDevUnlock) ? (
          <View testID="stats-free-locked-analytics" style={{ gap: 12 }}>
            {weekAnalyticsBlock}
            {percentilesBlock}
          </View>
        ) : percentilesBlock}

        <Modal transparent visible={wagerOpen} animationType="fade" onRequestClose={() => setWagerOpen(false)}>
          <Pressable testID="stats-series-wager-modal" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }} onPress={() => setWagerOpen(false)}>
            <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '82%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(20, insets.bottom + 12), borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: t.bgCard }}>
              <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: t.textGhost, alignSelf: 'center', marginBottom: 10 }}/>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Пари на серию', uk: 'Парі на серію', es: 'Apuesta de racha', 'pt-BR': 'Aposta de sequência', vi: 'Cược chuỗi', id: 'Taruhan rangkaian', tr: 'Seri bahsi', pl: 'Zakład o serię' })}
                </Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => setWagerOpen(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={24} color={t.textMuted}/>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} isGoldTheme={isGoldTheme} themeMode={themeMode} hideCta={totalStreak < 3}/>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* «Пари на серию» без активного пари: окно размещения ставки открывается
            сразу, без промежуточного листа с CTA-карточкой. */}
        {wagerPickerOpen ? (
          <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} isGoldTheme={isGoldTheme} themeMode={themeMode} hideCta={totalStreak < 3} pickerOnly onPickerClose={() => setWagerPickerOpen(false)}/>
        ) : null}

        {false && (<React.Fragment>
        <TouchableOpacity testID="stats-series-protection-toggle" activeOpacity={0.84} onPress={() => {
            hapticTap();
            setSeriesOpen((value) => !value);
        }}>
          <StatsCardArtSurface name="streak" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'streak', 'medium'), flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'streak') : null]}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'streak'), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flame-outline" size={22} color={isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'streak')}/>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }}>
              {triLang(lang, { ru: 'Серия и защита', uk: 'Серія і захист', es: 'Racha y protección', 'pt-BR': 'Sequência e proteção', vi: 'Chuỗi và bảo vệ', id: 'Rangkaian dan perlindungan', tr: 'Seri ve koruma', pl: 'Seria i ochrona' })}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '900' }}>
              {totalStreak} {triLang(lang, { ru: pluralRu(totalStreak, 'день', 'дня', 'дней'), uk: 'днів', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}
            </Text>
            <Ionicons name={seriesOpen ? 'chevron-up' : 'chevron-down'} size={19} color={t.textMuted}/>
          </StatsCardArtSurface>
        </TouchableOpacity>

        {seriesOpen ? (<>
        <StreakStatsHero t={t} f={f} lang={lang} themeMode={themeMode} totalStreak={totalStreak} bestStreak={bestStreak} days={days} freezeActive={freezeActive} chainShieldDays={chainShieldDays} purpleColor={purpleColor} isGoldTheme={isGoldTheme} isPremium={isPremium} premiumFreezeUsed={premiumFreezeUsed} freezeShardCost={FREEZE_COST_SHARDS} shardsBalance={shardsBalance} onFreezePress={handleFreezeStreak} reviveOffer={reviveOffer} onRevivePress={handleReviveStreak} percentilesStreak={percentiles.streak}/>

        {/* [WEEKLY BOONS] Плашка «бонус сегодня» — перенесена с главной. Отступ берёт gap контейнера. */}
        <TodaysBoonStrip marginTop={0}/>

        {/* ── ПАРИ НА ЦЕПОЧКУ — сразу под стриком: это действие про серию,
            в подвале экрана до него никто не доскролливал. Новичкам без серии
            CTA не показываем (активное пари и результат — показываем всегда). */}
        <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} isGoldTheme={isGoldTheme} themeMode={themeMode} hideCta={totalStreak < 3}/>

        {/* XP MULTIPLIERS BLOCK */}
        {(() => {
            const streakM = totalStreak >= 30 ? 1.8 : totalStreak >= 14 ? 1.6 : totalStreak >= 7 ? 1.4 : totalStreak >= 3 ? 1.2 : 1;
            const clubWeekTierM = 1 + engineLeague.id * 0.1;
            const clubCombinedM = clubBoostMultiplier + clubWeekTierM + stationaryClubMultiplier - 2;
            const comebackM = comebackActive ? 2 : 1;
            // Weekly Boons (двойной опыт / ранняя пташка) реально применяются в
            // xp_manager (boonXpMultiplierContribution), но раньше НЕ попадали ни в
            // total, ни в список — юзер видел активный бонус «Двойной опыт», а в
            // множителях его не было и итог был занижен. Считаем их здесь так же
            // (аддитивно), чтобы UI совпал с реальным начислением.
            const doubleXpM = doubleXpMultiplier();
            const earlyBirdM = earlyBirdMultiplier();
            const total = 1 + (streakM - 1) + (clubCombinedM - 1) + (leagueBoostMultiplier - 1) + (leagueGroupBoostMultiplier - 1) + (comebackM - 1) + (giftMultiplier - 1) + (doubleXpM - 1) + (earlyBirdM - 1);
            const hasBonus = total > 1;
            const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
            const bonusAccentColor = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'multipliers');
            const bonusGold = isGoldTheme ? GOLD_RICH.champagne : bonusAccentColor;
            const bonusMutedGold = isGoldTheme ? GOLD_RICH.antiqueGold : statsAccent(themeMode, 'percentiles');
            const items: {
                key: string;
                label: string;
                value: string;
                color: string;
                active: boolean;
            }[] = [
                { key: 'streak', label: triLang(lang, {
                        ru: 'Цепочка',
                        uk: 'Ланцюжок',
                        es: 'Racha',
                        'pt-BR': "Sequência",
                        vi: "Chuỗi",
                        id: "Rangkaian",
                        tr: "Seri",
                        pl: "Seria",
                    }), value: pct(streakM), color: isGoldTheme ? bonusGold : statsAccent(themeMode, 'streak'), active: streakM > 1 },
                { key: 'club', label: triLang(lang, {
                        ru: 'Лига',
                        uk: 'Ліга',
                        es: 'Liga',
                        'pt-BR': "Liga",
                        vi: "Giải đấu",
                        id: "Liga",
                        tr: "Lig",
                        pl: "Liga",
                    }), value: pct(clubCombinedM), color: isGoldTheme ? GOLD_RICH.metalGold : statsAccent(themeMode, 'multipliers'), active: clubCombinedM > 1 },
                { key: 'league_boost', label: triLang(lang, {
                        ru: 'Буст лиги',
                        uk: 'Буст ліги',
                        es: 'Impulso de liga',
                        'pt-BR': "Impulso de liga",
                        vi: "Tăng lực giải đấu",
                        id: "Dorongan liga",
                        tr: "Lig güçlendirmesi",
                        pl: "Wzmocnienie ligi",
                    }), value: pct(leagueBoostMultiplier), color: isGoldTheme ? bonusMutedGold : statsAccent(themeMode, 'percentiles'), active: leagueBoostMultiplier > 1 },
                { key: 'league_group_boost', label: triLang(lang, {
                        ru: 'Общий буст лиги',
                        uk: 'Спільний буст ліги',
                        es: 'Impulso común de liga',
                        'pt-BR': "Impulso comum de liga",
                        vi: "Tăng lực chung giải đấu",
                        id: "Dorongan liga bersama",
                        tr: "Ortak lig güçlendirmesi",
                        pl: "Wspólne wzmocnienie ligi",
                    }), value: pct(leagueGroupBoostMultiplier), color: isGoldTheme ? bonusMutedGold : statsAccent(themeMode, 'multipliers'), active: leagueGroupBoostMultiplier > 1 },
                { key: 'comeback', label: triLang(lang, {
                        ru: 'Возврат',
                        uk: 'Повернення',
                        es: 'Bonificación de retorno',
                        'pt-BR': "Bônus de retorno",
                        vi: "Thưởng quay lại",
                        id: "Bonus kembali",
                        tr: "Geri dönüş bonusu",
                        pl: "Bonus powrotu",
                    }), value: pct(comebackM), color: isGoldTheme ? bonusMutedGold : statsAccent(themeMode, 'freeze'), active: comebackActive },
                { key: 'gift', label: triLang(lang, {
                        ru: 'Подарок уровня',
                        uk: 'Подарунок рівня',
                        es: 'Regalo de nivel',
                        'pt-BR': "Presente de nível",
                        vi: "Quà cấp độ",
                        id: "Hadiah level",
                        tr: "Seviye hediyesi",
                        pl: "Prezent za poziom",
                    }), value: pct(giftMultiplier), color: isGoldTheme ? bonusGold : statsAccent(themeMode, 'percentiles'), active: giftMultiplier > 1 },
                { key: 'double_xp', label: triLang(lang, {
                        ru: 'Двойной опыт',
                        uk: 'Подвійний досвід',
                        es: 'Experiencia doble',
                        'pt-BR': 'Experiência dobrada',
                        vi: 'Kinh nghiệm nhân đôi',
                        id: 'XP ganda',
                        tr: 'Çift tecrübe',
                        pl: 'Podwójne XP',
                    }), value: pct(doubleXpM), color: isGoldTheme ? bonusGold : statsAccent(themeMode, 'multipliers'), active: doubleXpM > 1 },
                { key: 'early_bird', label: triLang(lang, {
                        ru: 'Ранняя пташка',
                        uk: 'Рання пташка',
                        es: 'Madrugador',
                        'pt-BR': 'Madrugador',
                        vi: 'Dậy sớm',
                        id: 'Bangun pagi',
                        tr: 'Erkenci',
                        pl: 'Ranny ptaszek',
                    }), value: pct(earlyBirdM), color: isGoldTheme ? bonusMutedGold : statsAccent(themeMode, 'percentiles'), active: earlyBirdM > 1 },
            ];
            const activeItems = items.filter(i => i.active);
            const bonusAccent = isGoldTheme
                ? (hasBonus ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                :
                    statsBorder(themeMode, 'multipliers', hasBonus ? 'strong' : 'soft');
            if (!bonusOpen) {
                return (<TouchableOpacity testID="stats-bonus-collapsed" activeOpacity={0.84} onPress={() => {
                        hapticTap();
                        setBonusOpen(true);
                    }}>
                <StatsCardArtSurface name="multipliers" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} scrim="stats" style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 0, borderColor: bonusAccent, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'multipliers') : null]}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isGoldTheme ? (hasBonus ? GOLD_RICH.washStrong : GOLD_RICH.bronzeWash) : statsSoftBg(themeMode, 'multipliers', hasBonus ? 'strong' : 'normal'), alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="sparkles-outline" size={22} color={isGoldTheme ? (hasBonus ? GOLD_RICH.champagne : GOLD_RICH.agedGold) : bonusAccentColor}/>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, {
                        ru: 'Бонус к XP',
                        uk: 'Бонус до XP',
                        es: 'Bono de XP',
                        'pt-BR': "Bônus de XP",
                        vi: "Thưởng XP",
                        id: "Bonus XP",
                        tr: "XP bonusu",
                        pl: "Bonus XP",
                    })}: ×{total.toFixed(2)}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35, marginTop: 3 }}>
                      {(() => {
                        // Прогресс к следующему порогу серии превращает справку в цель.
                        // Прогноз — от ИТОГОВОГО множителя (другие бонусы, напр. Plus ×1.25,
                        // сохраняются): раньше при total ×1.25 текст обещал «вырастет до ×1.2».
                        const nextTier = totalStreak >= 30 ? null
                            : totalStreak >= 14 ? { days: 30, m: 1.8 }
                            : totalStreak >= 7 ? { days: 14, m: 1.6 }
                            : totalStreak >= 3 ? { days: 7, m: 1.4 }
                            : { days: 3, m: 1.2 };
                        if (nextTier) {
                            const tier = nextTier as { days: number; m: number };
                            const left = tier.days - totalStreak;
                            const projected = `×${(total + (tier.m - streakM)).toFixed(2).replace(/0$/, '')}`;
                            return triLang(lang, {
                                ru: `Ещё ${left} ${pluralRu(left, 'день', 'дня', 'дней')} серии — и бонус вырастет до ${projected}`,
                                uk: `Ще ${left} ${pluralRu(left, 'день', 'дні', 'днів')} серії — і бонус зросте до ${projected}`,
                                es: `${left} ${left === 1 ? 'día' : 'días'} más de racha y el bono sube a ${projected}`,
                                'pt-BR': `Mais ${left} ${left === 1 ? 'dia' : 'dias'} de sequência e o bônus sobe para ${projected}`,
                                vi: `Thêm ${left} ngày chuỗi nữa — thưởng tăng lên ${projected}`,
                                id: `${left} hari rangkaian lagi — bonus naik ke ${projected}`,
                                tr: `${left} gün daha seri — bonus ${projected} olacak`,
                                pl: `Jeszcze ${left} ${left === 1 ? 'dzień' : 'dni'} serii — bonus wzrośnie do ${projected}`,
                            });
                        }
                        return triLang(lang, {
                            ru: 'Максимальный бонус за серию — так держать!',
                            uk: 'Максимальний бонус за серію — так тримати!',
                            es: 'Bono máximo por racha, ¡sigue así!',
                            'pt-BR': 'Bônus máximo de sequência — continue assim!',
                            vi: 'Thưởng chuỗi tối đa — cứ thế nhé!',
                            id: 'Bonus rangkaian maksimal — pertahankan!',
                            tr: 'Maksimum seri bonusu — böyle devam!',
                            pl: 'Maksymalny bonus za serię — tak trzymaj!',
                        });
                      })()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={isLightThemeMode(themeMode) ? 'rgba(23,32,29,0.45)' : 'rgba(255,255,255,0.45)'}/>
                </StatsCardArtSurface>
              </TouchableOpacity>);
            }
            return (<StatsCardArtSurface name="multipliers" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} scrim="stats" testID="stats-bonus-expanded" style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 0, borderColor: bonusAccent, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'multipliers') : null]}>
              <TouchableOpacity activeOpacity={0.84} onPress={() => {
                    hapticTap();
                    setBonusOpen(false);
                }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeItems.length > 0 ? 10 : 0 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {triLang(lang, {
                    ru: 'Активные множители опыта',
                    uk: 'Активні множники досвіду',
                    es: 'Multiplicadores de experiencia activos',
                    'pt-BR': "Multiplicadores de experiência ativos",
                    vi: "Hệ số kinh nghiệm đang hoạt động",
                    id: "Pengali pengalaman aktif",
                    tr: "Aktif deneyim çarpanları",
                    pl: "Aktywne mnożniki doświadczenia",
                })}
                </Text>
                <Text style={{ color: hasBonus ? (isGoldTheme ? GOLD_RICH.champagne : bonusAccentColor) : t.textGhost, fontSize: f.bodyLg, fontWeight: '900' }}>
                  ×{total.toFixed(2)}
                </Text>
              </TouchableOpacity>
              {activeItems.length === 0 ? (<Text style={{ color: t.textGhost, fontSize: f.caption, marginTop: 6 }}>
                  {triLang(lang, {
                        ru: 'Нет активных бонусов',
                        uk: 'Немає активних бонусів',
                        es: 'No hay bonificaciones activas',
                        'pt-BR': "Não há bonificações ativas",
                        vi: "Không có thưởng đang hoạt động",
                        id: "Tidak ada bonus aktif",
                        tr: "Aktif bonus yok",
                        pl: "Brak aktywnych bonusów",
                    })}
                </Text>) : (<View style={{ gap: 6 }}>
                  {activeItems.map(item => {
                        const isGiftItem = item.key === 'gift';
                        const isClubRow = item.key === 'club';
                        const isLeagueBoostRow = item.key === 'league_boost';
                        const isLeagueGroupBoostRow = item.key === 'league_group_boost';
                        const giftMeta = giftXpBankRemaining > 0
                            ? triLang(lang, {
                                ru: `×2 ещё на ${giftXpBankRemaining} XP`,
                                uk: `×2 ще на ${giftXpBankRemaining} XP`,
                                es: `×2 por ${giftXpBankRemaining} XP más`,
                                'pt-BR': `×2 por mais ${giftXpBankRemaining} XP`,
                                vi: `×2 cho thêm ${giftXpBankRemaining} XP`,
                                id: `×2 untuk ${giftXpBankRemaining} XP lagi`,
                                tr: `×2, ${giftXpBankRemaining} XP daha`,
                                pl: `×2 przez kolejne ${giftXpBankRemaining} XP`,
                            })
                            : giftTimeLeft;
                        return (<View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 10, backgroundColor: isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }}/>
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>{item.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: item.color, fontSize: f.caption, fontWeight: '700' }}>{item.value}</Text>
                          {isGiftItem && !!giftMeta && (<Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{giftMeta}</Text>)}
                          {isClubRow && clubBoostMultiplier > 1 && !!clubBoostTimeLeft && (<Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{clubBoostTimeLeft}</Text>)}
                          {isLeagueBoostRow && leagueBoostMultiplier > 1 && !!leagueBoostTimeLeft && (<Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{leagueBoostTimeLeft}</Text>)}
                          {isLeagueGroupBoostRow && leagueGroupBoostMultiplier > 1 && !!leagueGroupBoostTimeLeft && (<Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{leagueGroupBoostTimeLeft}</Text>)}
                        </View>
                      </View>);
                    })}
                </View>)}
            </StatsCardArtSurface>);
        })()}
        </>) : null}

        {/* Перцентили — единый блок: горизонтальные дорожки «ты обходишь N%». */}
        {(() => {
            const pItems: {
                icon: keyof typeof Ionicons.glyphMap;
                color: string;
                label: string;
                percent: number;
            }[] = [];
            const visibleXpPercentile = visiblePercentile(percentiles.xp);
            const visibleDaily7XpPercentile = visiblePercentile(percentiles.daily7xp, myXp7 > 0);
            const visibleDaily7TimePercentile = visiblePercentile(percentiles.daily7timeMs, myTime7ms > 0);
            if (visibleXpPercentile !== null)
                pItems.push({ icon: 'trophy-outline', color: isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'multipliers'), percent: visibleXpPercentile as number, label: triLang(lang, {
                        ru: 'Суммарный опыт', uk: 'Сумарний досвід', es: 'XP total', 'pt-BR': 'XP total', vi: 'Tổng XP', id: 'Total XP', tr: 'Toplam XP', pl: 'Łączne XP',
                    }) });
            // «Опыт за неделю» (календарная) убран: для пользователя дублировал
            // «Опыт за 7 дней», а по понедельникам выглядел сломанным нулём.
            if (visibleDaily7XpPercentile !== null)
                pItems.push({ icon: 'trending-up-outline', color: isGoldTheme ? GOLD_RICH.antiqueGold : statsAccent(themeMode, 'percentiles'), percent: visibleDaily7XpPercentile as number, label: triLang(lang, {
                        ru: 'Опыт за 7 дней', uk: 'Досвід за 7 днів', es: 'XP en 7 días', 'pt-BR': 'XP em 7 dias', vi: 'XP trong 7 ngày', id: 'XP 7 hari', tr: '7 günde XP', pl: 'XP w 7 dni',
                    }) });
            if (visibleDaily7TimePercentile !== null)
                pItems.push({ icon: 'time-outline', color: isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'freeze'), percent: visibleDaily7TimePercentile as number, label: triLang(lang, {
                        ru: 'Время за 7 дней', uk: 'Час за 7 днів', es: 'Tiempo en 7 días', 'pt-BR': 'Tempo em 7 dias', vi: 'Thời gian 7 ngày', id: 'Waktu 7 hari', tr: '7 günde süre', pl: 'Czas w 7 dni',
                    }) });
            if (pItems.length === 0)
                return null;
            return (<>
            <TouchableOpacity testID="stats-comparison-toggle" activeOpacity={0.84} onPress={() => {
                    hapticTap();
                    setComparisonOpen((value) => !value);
                }}>
              <StatsCardArtSurface name="percentiles" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'percentiles', 'medium'), flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'percentiles') : null]}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Твой результат среди других',
                    uk: 'Твій результат серед інших',
                    es: 'Tu resultado entre otros',
                    'pt-BR': 'Seu resultado entre outros',
                    vi: 'Kết quả của bạn so với người khác',
                    id: 'Hasilmu dibanding yang lain',
                    tr: 'Diğerleri arasındaki sonucun',
                    pl: 'Twój wynik na tle innych',
                  })}
                </Text>
                {!isPremium && <PlusBadge themeMode={themeMode} size="xs"/>}
                <Ionicons name={comparisonOpen ? 'chevron-up' : 'chevron-down'} size={19} color={t.textMuted}/>
              </StatsCardArtSurface>
            </TouchableOpacity>
            {comparisonOpen ? (<StatsPremiumBlur isPremium={isPremium} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
              <StatsCardArtSurface name="percentiles" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 16, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'percentiles', 'medium'), overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'percentiles') : null]}>
                <View style={{ gap: 16 }}>
                  {pItems.map((item, idx) => (
                    <StatProgressRow
                      key={item.label}
                      percent={item.percent}
                      label={item.label}
                      icon={item.icon}
                      accent={item.color}
                      accentSoft={item.color + 'AA'}
                      trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsSoftBg(themeMode, 'percentiles', 'quiet')}
                      iconChipBg={item.color + '24'}
                      labelColor={t.textPrimary}
                      valueColor={item.color}
                      delayMs={120 + idx * 110}
                    />
                  ))}
                </View>
              </StatsCardArtSurface>
            </StatsPremiumBlur>) : null}
            </>);
        })()}
        </React.Fragment>)}

        {false && (<React.Fragment>
        {/* Историческая реализация сохранена в коде для обратной совместимости данных,
            но отдельный «Весь путь» удалён с экрана по решению пользователя. */}
        <TouchableOpacity testID="legacy-stats-details-toggle" activeOpacity={0.84} onPress={() => {
            hapticTap();
            setDetailsOpen((v) => !v);
        }}>
          <StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} scrim="stats" style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'archiveMap', 'medium'), flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'archiveMap') : null]}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'archiveMap'), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bar-chart-outline" size={22} color={isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'archiveMap')}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                {triLang(lang, {
            ru: 'Архив',
            uk: 'Архів',
            es: 'Archivo',
            'pt-BR': "Arquivo",
            vi: "Lưu trữ",
            id: "Arsip",
            tr: "Arşiv",
            pl: "Archiwum",
        })}
              </Text>
            </View>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={isLightThemeMode(themeMode) ? 'rgba(23,32,29,0.45)' : 'rgba(255,255,255,0.45)'}/>
          </StatsCardArtSurface>
        </TouchableOpacity>

        {detailsOpen && (<View testID="stats-details-expanded" style={{ gap: 12 }}>
        {/* График по дням: переключатель «Опыт» / «Время» — для !premium закрыт blur\'ом + lock CTA. */}
        <StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="pathChart" devUnlock={statsDevUnlock}>
        {(() => {
                const chartDays = allDays.length > 0 ? allDays : days;
                // У новичка график — простыня пустых столбиков; вместо неё честная заглушка.
                if (chartDays.filter(d => d.active).length < 3) {
                    return (<StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={16} scrim="stats" style={{ borderRadius: 16, padding: 20, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap'), alignItems: 'center' }}>
                    <Ionicons name="bar-chart-outline" size={24} color={t.textMuted}/>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', marginTop: 8, lineHeight: f.sub * 1.4 }}>
                      {triLang(lang, {
                        ru: 'График появится после пары дней практики',
                        uk: 'Графік з’явиться після кількох днів практики',
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
                const maxAllPts = Math.max(...chartDays.map(d => d.points), 1);
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
                const segBg = t.bgSurface ?? (isLightTheme ? 'rgba(0,0,0,0.06)' : t.bgSurface);
                const segActive = t.bgCard ?? t.bgSurface2 ?? '#2a2a2a';
                return (<StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={16} scrim="stats" style={{ borderRadius: 16, padding: 16, paddingBottom: 8, borderWidth: 0, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap') }}>
              <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        borderRadius: 12,
                        padding: 3,
                        backgroundColor: segBg,
                        borderWidth: 0,
                        borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap'),
                    }}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => {
                        hapticTap();
                        setDailyChartTab('xp');
                    }} style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 9,
                        alignItems: 'center',
                        backgroundColor: dailyChartTab === 'xp' ? segActive : 'transparent',
                        borderWidth: dailyChartTab === 'xp' ? 0.5 : 0,
                        borderColor: dailyChartTab === 'xp' ? (isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap')) : 'transparent',
                    }}>
                  <Text style={{
                        color: dailyChartTab === 'xp' ? t.textPrimary : t.textMuted,
                        fontSize: f.body,
                        fontWeight: dailyChartTab === 'xp' ? '700' : '500',
                    }}>
                    {triLang(lang, {
                        ru: 'Опыт',
                        uk: 'Досвід',
                        es: 'XP',
                        'pt-BR': "XP",
                        vi: "XP",
                        id: "XP",
                        tr: "XP",
                        pl: "XP",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={() => {
                        hapticTap();
                        setDailyChartTab('time');
                    }} style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 9,
                        alignItems: 'center',
                        backgroundColor: dailyChartTab === 'time' ? segActive : 'transparent',
                        borderWidth: dailyChartTab === 'time' ? 0.5 : 0,
                        borderColor: dailyChartTab === 'time' ? (isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap')) : 'transparent',
                    }}>
                  <Text style={{
                        color: dailyChartTab === 'time' ? t.textPrimary : t.textMuted,
                        fontSize: f.body,
                        fontWeight: dailyChartTab === 'time' ? '700' : '500',
                    }}>
                    {triLang(lang, {
                        ru: 'Время',
                        uk: 'Час',
                        es: 'Tiempo',
                        'pt-BR': "Tempo",
                        vi: "Thời gian",
                        id: "Waktu",
                        tr: "Süre",
                        pl: "Czas",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView key={dailyChartTab} ref={chartScrollRef} decelerationRate="normal" horizontal showsHorizontalScrollIndicator indicatorStyle="white" onLayout={() => chartScrollRef.current?.scrollToEnd?.({ animated: false })} contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 12 }}>
                {dailyChartTab === 'xp'
                        ? chartDays.map((d, i) => {
                            const barH = d.points > 0 ? Math.max((d.points / maxAllPts) * CHART_H, 8) : 5;
                            const isToday = d.date === today;
                            const barColor = d.active
                                ? (isToday ? t.textPrimary : t.accent)
                                : (isToday ? t.border : t.bgSurface2 ?? t.border);
                            const ptsLabel = formatActivityBarPoints(d.points, lang);
                            return (<View key={i} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                          <View style={{ height: CHART_VALUE_LABEL_H, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                            <AdaptiveLabel testID={`stats-lifetime-chart-value-xp-${d.date}`} provenance="authored" availableWidth={26} compactLineLimit={1} style={{
                                    color: d.points > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                    fontSize: 7,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }}>
                              {ptsLabel}
                            </AdaptiveLabel>
                          </View>
                          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                            <View style={{
                                    width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                                    backgroundColor: barColor,
                                    opacity: d.active ? 1 : 0.35,
                                }}/>
                          </View>
                          <AdaptiveLabel testID={`stats-lifetime-chart-day-xp-${d.date}`} provenance="authored" availableWidth={26} compactLineLimit={1} style={{
                                    color: isToday ? t.textPrimary : t.textMuted,
                                    fontSize: 8, fontWeight: isToday ? '800' : '400',
                                    lineHeight: 11,
                                }}>{d.shortLabel}</AdaptiveLabel>
                          <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                        </View>);
                        })
                        : timeDaysChart.map((d, i) => {
                            const barH = d.ms > 0 ? Math.max((d.ms / maxMs) * CHART_H, 8) : 5;
                            const isToday = d.date === today;
                            const barColor = d.active
                                ? (isToday ? t.textPrimary : t.accent)
                                : (isToday ? t.border : t.bgSurface2 ?? t.border);
                            const timeLabel = formatTimeBarMs(d.ms, lang);
                            return (<View key={`t-${i}`} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                          <View style={{ height: CHART_VALUE_LABEL_H, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                            <AdaptiveLabel testID={`stats-lifetime-chart-value-time-${d.date}`} provenance="authored" availableWidth={26} compactLineLimit={1} style={{
                                    color: d.ms > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                    fontSize: 7,
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
                                    fontSize: 8, fontWeight: isToday ? '800' : '400',
                                    lineHeight: 11,
                                }}>{d.shortLabel}</AdaptiveLabel>
                          <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                        </View>);
                        })}
              </ScrollView>
            </StatsCardArtSurface>);
            })()}
        </StatsPremiumBlur>

        {lifetimeStats != null && (<StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="lifetimeTotals" devUnlock={statsDevUnlock}>
            <LifetimeTotalsBlock t={{
                    bgCard: t.bgCard,
                    bgSurface: t.bgSurface,
                    border: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap'),
                    textPrimary: t.textPrimary,
                    textSecond: t.textSecond,
                    textMuted: t.textMuted,
                    accent: t.accent,
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
                    backgroundColor: 'rgba(255, 180, 60, 0.14)',
                    borderWidth: 0,
                    borderColor: 'rgba(255, 160, 40, 0.45)',
                }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
              {triLang(lang, {
                    ru: devLifetimeChartsBusy ? 'Генерация…' : 'Dev: случайные графики «Весь путь» (7 дн.)',
                    uk: devLifetimeChartsBusy ? 'Генерація…' : 'Dev: випадкові графіки «Увесь шлях» (7 дн.)',
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

      <ThemedConfirmModal visible={freezeNeedShardsModal} title={triLang(lang, {
            ru: 'Недостаточно жемчуга',
            uk: 'Недостатньо перлин',
            es: 'No tienes suficientes perlas',
            'pt-BR': "Você não tem pérolas suficientes",
            vi: "Bạn không có đủ ngọc trai",
            id: "Mutiara kamu tidak cukup",
            tr: "Yeterli incin yok",
            pl: "Nie masz wystarczająco monet",
        })} messageNode={<View style={{ gap: 4, marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                ru: 'Стоимость заморозки:',
                uk: 'Вартість заморозки:',
                es: 'Coste de congelar:',
                'pt-BR': "Custo para congelar:",
                vi: "Chi phí đóng băng:",
                id: "Biaya pembekuan:",
                tr: "Dondurma maliyeti:",
                pl: "Koszt zamrożenia:",
            })}
              </Text>
              <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted}/>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                ru: 'Твой баланс:',
                uk: 'Твій баланс:',
                es: 'Tu saldo:',
                'pt-BR': "Seu saldo:",
                vi: "Số dư của bạn:",
                id: "Saldomu:",
                tr: "Bakiyen:",
                pl: "Twoje saldo:",
            })}
              </Text>
              <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted}/>
            </View>
          </View>} cancelLabel={triLang(lang, {
            ru: 'Отмена',
            uk: 'Скасувати',
            es: 'Cancelar',
            'pt-BR': "Cancelar",
            vi: "Hủy",
            id: "Batal",
            tr: "İptal",
            pl: "Anuluj",
        })} confirmLabel={triLang(lang, {
            ru: 'В магазин',
            uk: 'У магазин',
            es: 'A la tienda',
            'pt-BR': "Ir à loja",
            vi: "Đến cửa hàng",
            id: "Ke toko",
            tr: "Mağazaya",
            pl: "Do sklepu",
        })} onCancel={() => setFreezeNeedShardsModal(false)} onConfirm={() => {
            navigateAfterModalClose(() => setFreezeNeedShardsModal(false), () => router.push({
                pathname: '/shards_shop',
                params: {
                    need: String(Math.max(0, FREEZE_COST_SHARDS - shardsBalance)),
                    source: 'streak_stats_freeze',
                },
            } as any));
        }}/>

      <StreakReviveModal
        visible={reviveModalVisible && reviveOffer !== null}
        offer={reviveOffer}
        shopReturnTo="streak_stats"
        onClose={() => setReviveModalVisible(false)}
        onRevived={(restored) => {
            setTotalStreak(restored);
            setBestStreak(prev => Math.max(prev, restored));
            setReviveOffer(null);
            setReviveModalVisible(false);
            void getShardsBalance().then(setShardsBalance).catch(() => { });
            void loadAll();
        }}
      />

    </SafeAreaView>
    </View>);
}

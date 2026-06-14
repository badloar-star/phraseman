import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Reanimated from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { Animated, View, Text, ScrollView, Modal, Pressable, TouchableOpacity, Platform, Share, PanResponder, StyleSheet, } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import StatsArtBackdrop from '../components/StatsArtBackdrop';
import StatsCardArtSurface from '../components/StatsCardArtSurface';
import ReportErrorButton from '../components/ReportErrorButton';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { streakCalendarShortWeekdays, streakWeeklyExperienceHint, streakWeeklyExperienceLabel, streakWeeklyTimeTotalHint, streakWeekRowShort, streakWagerTierDaysLabel, } from '../constants/streak_stats_i18n';
import { LEAGUES } from './league_engine';
import { getEffectiveWagerStake, loadWager, placeWager, wagerDaysLeft, WagerState, WAGER_TIERS } from './streak_wager';
// stationary_clubs feature удалён.
import { ENABLE_DEV_TOOLS, STORE_URL } from './config';
import { shouldDevUnlockStatsPremiumContent } from './stats_premium_access';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import StatsPremiumBlur from '../components/StatsPremiumBlur';
import ActivityHeatmap365 from '../components/ActivityHeatmap365';
import { StreakChainIcon } from '../components/StreakChainIcon';
import StreakReviveModal from '../components/StreakReviveModal';
import { hapticTap } from '../hooks/use-haptics';
import { getShardsBalance, spendShards } from './shards_system';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { getStatsCache, hydrateStatsCacheFromStorage, refreshStatsCache, type StatsCachedDay, type StatsCachedTimeDay, type StatsPreloadData, } from './statsCache';
import { emitAppEvent, onAppEvent } from './events';
import { oskolokImageForPackShards } from './oskolok';
import { loadActiveLeagueBoost } from './league_personal_boosts';
import { formatLeagueGroupBoostTimeLeft, getActiveLeagueGroupBoost } from './league_group_boosts';
import { syncDailyAnalyticsIfNeeded, loadPercentileData } from './daily_analytics_sync';
import { type AllPercentiles } from './leaderboard_stats';
import { loadLifetimeProfileStats, readLifetimeProfileStatsCache, type LifetimeProfileStats } from './lifetime_profile_stats';
import { devRandomizeLifetimePathDailyMetrics, loadLifetimeTotalsChartDays, type LifetimeTotalsChartKind, type LifetimeChartDay, type DevLifetimePathRandomSums, } from './stats_daily_breakdown';
import { loadAchievementStates } from './achievements';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import type { ThemeMode } from '../constants/theme';
import { statsAccent, statsBorder, statsGlowStyle, statsHairline, statsSoftBg, statsThemeAccent, statsThemeSoftBg, type StatsChromeTone } from '../constants/statsThemeChrome';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../constants/streakIconAssets';
import GoldBevel from '../components/GoldBevel';
import { StatScoreRing } from '../components/stats/StatScoreRing';
import { StatBars, type StatBar } from '../components/stats/StatBars';
import { StatProgressRow } from '../components/stats/StatProgressRow';
import { StatCountUpText } from '../components/stats/StatCountUpText';
import { AiBlockNote } from '../components/stats/AiBlockNote';
import { getStatsInsightsState, generateStatsInsights, type StatsInsightsNotes, type StatsInsightsBriefing } from './stats_insights_client';
import { loadActivity365Analytics } from './activity_365_analytics';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { navigateAfterModalClose } from './safe_modal_navigation';
import { loadPendingLevelGiftCount, readPendingLevelGiftCountCache } from './level_gift_inventory';
import { collectiblesTotalCount } from './collectibles/catalog';
import { getCollectiblesProgress, getCollectiblesUnseenCount } from './collectibles/storage';
import { isCollectiblesEnabled } from './remote_flags';
import { shouldUsePracticeWarmup } from './streak_stats_practice_balance';
import { safeRouterBack } from './navigation_back';
import { visiblePercentile } from './stats_percentile_display';
import { getReviveOffer, type StreakReviveOffer } from './streak_revive';
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
    return false ? Math.min(fallback, 10) : fallback;
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
function ruAchievementRewardPhrase(total: number): string {
    return `${total} ${pluralRu(total, 'достижение', 'достижения', 'достижений')}`;
}
function ukAchievementRewardPhrase(total: number): string {
    return `${total} ${pluralRu(total, 'досягнення', 'досягнення', 'досягнень')}`;
}
function plAchievementPhrase(total: number): string {
    return `${total} ${pluralRu(total, 'osiągnięcie', 'osiągnięcia', 'osiągnięć')}`;
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
const STATS_TRAINER_ACTION_MIN_DUE = 5;
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
        ru: `${h} ч ${m} мин`,
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
    const measured = sourceDays.filter((d) => d.date <= todayStr).slice(-7);
    const rhythmDays: LearningRhythmDay[] = measured.map((d) => {
        const minutes = minutesFromMs(timeByDate.get(d.date)?.ms ?? 0);
        const active = d.active || d.points > 0 || minutes > 0;
        return {
            ...d,
            active,
            minutes,
            combined: d.points + minutes * 6,
            isToday: d.date === todayStr,
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
    const focusPart = clampNumber(avgMinutesActive / 12, 0, 1) * 25;
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
                ru: 'Нужно чуть ровнее',
                uk: 'Потрібно трохи рівніше',
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
    let rhythmSummary = triLang(lang, {
        ru: `Лучший день: ${bestDay?.shortLabel ?? '-'} · слабый: ${weakDay?.shortLabel ?? '-'}`,
        uk: `Найкращий день: ${bestDay?.shortLabel ?? '-'} · слабкий: ${weakDay?.shortLabel ?? '-'}`,
        es: `Mejor día: ${bestDay?.shortLabel ?? '-'} · flojo: ${weakDay?.shortLabel ?? '-'}`,
        'pt-BR': `Melhor dia: ${bestDay?.shortLabel ?? '-'} · fraco: ${weakDay?.shortLabel ?? '-'}`,
        vi: `Ngày tốt nhất: ${bestDay?.shortLabel ?? '-'} · yếu: ${weakDay?.shortLabel ?? '-'}`,
        id: `Hari terbaik: ${bestDay?.shortLabel ?? '-'} · lemah: ${weakDay?.shortLabel ?? '-'}`,
        tr: `En iyi gün: ${bestDay?.shortLabel ?? '-'} · zayıf: ${weakDay?.shortLabel ?? '-'}`,
        pl: `Najlepszy dzień: ${bestDay?.shortLabel ?? '-'} · słaby: ${weakDay?.shortLabel ?? '-'}`,
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
            ru: 'Первые данные записаны',
            uk: 'Перші дані записано',
            es: 'Primeros datos guardados',
            'pt-BR': "Primeiros dados salvos",
            vi: "Đã ghi dữ liệu đầu tiên",
            id: "Data awal tersimpan",
            tr: "İlk veriler kaydedildi",
            pl: "Pierwsze dane zapisane",
        });
        scoreHint = triLang(lang, {
            ru: `Сейчас видно: ${active7} активн. дн., ${humanMinutes(avgMinutesActive, lang)} в среднем за активный день. Оценка будет уточняться после каждой практики.`,
            uk: `Зараз видно: ${active7} акт. дн., ${humanMinutes(avgMinutesActive, lang)} у середньому за активний день. Оцінка уточнюватиметься після кожної практики.`,
            es: `Ahora se ve: ${active7} d. activos, ${humanMinutes(avgMinutesActive, lang)} de media por día activo. La evaluación se ajusta tras cada práctica.`,
            'pt-BR': `Agora aparece: ${active7} d. ativos, ${humanMinutes(avgMinutesActive, lang)} em média por dia ativo. A avaliação se ajusta após cada prática.`,
            vi: `Hiện có: ${active7} ngày hoạt động, trung bình ${humanMinutes(avgMinutesActive, lang)} mỗi ngày hoạt động. Đánh giá sẽ cập nhật sau mỗi lần luyện.`,
            id: `Saat ini terlihat: ${active7} h aktif, rata-rata ${humanMinutes(avgMinutesActive, lang)} per hari aktif. Penilaian diperbarui setelah tiap latihan.`,
            tr: `Şu an görünen: ${active7} aktif gün, aktif gün başına ortalama ${humanMinutes(avgMinutesActive, lang)}. Değerlendirme her pratikten sonra güncellenir.`,
            pl: `Teraz widać: ${active7} aktyw. dni, średnio ${humanMinutes(avgMinutesActive, lang)} na aktywny dzień. Ocena będzie aktualizowana po każdym ćwiczeniu.`,
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
        { kind: 'quizzes_completed', numValue: data.quizzesTotal, label: triLang(lang, { ru: 'Вызовов пройдено', uk: 'Квізів пройдено', es: 'Cuestionarios hechos', 'pt-BR': 'Quizzes feitos', vi: 'Quiz đã làm', id: 'Kuis dikerjakan', tr: 'Yapılan quizler', pl: 'Zrobione quizy' }) },
        { kind: 'arena_wins', numValue: data.arenaWins, label: triLang(lang, { ru: 'Побед на Арене', uk: 'Перемог на Арені', es: 'Victorias en Arena', 'pt-BR': 'Vitórias na Arena', vi: 'Thắng ở Đấu trường', id: 'Kemenangan di Arena', tr: 'Arena zaferleri', pl: 'Zwycięstwa na Arenie' }) },
        { kind: 'arena_losses', numValue: data.arenaLosses, label: triLang(lang, { ru: 'Поражений на Арене', uk: 'Поразок на Арені', es: 'Derrotas en Arena', 'pt-BR': 'Derrotas na Arena', vi: 'Thua ở Đấu trường', id: 'Kekalahan di Arena', tr: 'Arena yenilgileri', pl: 'Porażki na Arenie' }) },
        { kind: 'daily_tasks_claimed', numValue: data.dailyTasksClaimed, label: triLang(lang, { ru: 'Заданий дня выполнено', uk: 'Завдань дня виконано', es: 'Misiones diarias hechas', 'pt-BR': 'Missões diárias feitas', vi: 'Nhiệm vụ hằng ngày đã làm', id: 'Misi harian selesai', tr: 'Tamamlanan günlük görevler', pl: 'Wykonane misje dzienne' }) },
        { kind: 'shards_earned', numValue: data.shardsEarned, label: triLang(lang, { ru: 'Осколков заработано', uk: 'Осколків зароблено', es: 'Fragmentos ganados', 'pt-BR': 'Fragmentos ganhos', vi: 'Mảnh đã kiếm', id: 'Fragmen diperoleh', tr: 'Kazanılan parçalar', pl: 'Zdobyte odłamki' }) },
        { kind: 'shards_spent', numValue: data.shardsSpent, label: triLang(lang, { ru: 'Осколков потрачено', uk: 'Осколків витрачено', es: 'Fragmentos gastados', 'pt-BR': 'Fragmentos gastos', vi: 'Mảnh đã dùng', id: 'Fragmen dipakai', tr: 'Harcanan parçalar', pl: 'Wydane odłamki' }) },
    ];
    // В dev/teaser-режимах (gateExpandAll / showAllPathCharts) показываем все строки
    // без сворачивания, иначе прячем нулевые под раскрывашку, чтобы у новичка
    // не было простыни нулей.
    const collapseZeros = !gateExpandAll && !showAllPathCharts;
    const zeroRows = collapseZeros ? lifetimeRows.filter((r) => r.numValue <= 0) : [];
    const [zeroRowsExpanded, setZeroRowsExpanded] = React.useState(false);
    return (<StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={[t.bgCard, t.bgCard, t.bgSurface]} radius={18} scrim="strong" style={{
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            borderWidth: 0.5,
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
      <Text style={{
            color: t.textMuted,
            fontSize: f.sub,
            marginTop: -4,
            marginBottom: 8,
            lineHeight: f.sub * 1.35,
        }}>
        {triLang(lang, {
            ru: 'Числа справа — общий итог за всё время.',
            uk: 'Числа праворуч — загальний підсумок за весь час.',
            es: 'Los números de la derecha son el total histórico.',
            'pt-BR': "Os números à direita são o total histórico.",
            vi: "Các số bên phải là tổng từ trước đến nay.",
            id: "Angka di kanan adalah total historis.",
            tr: "Sağdaki sayılar tüm zamanlar toplamıdır.",
            pl: "Liczby po prawej to suma historyczna.",
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
                    ru: `Ещё ${zeroRows.length} — пока без данных`,
                    uk: `Ще ${zeroRows.length} — поки без даних`,
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
    'quizzes_completed',
    'arena_wins',
    'arena_losses',
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
        quizzesTotal: sums.quizzesTotal,
        arenaWins: sums.arenaWins,
        arenaLosses: sums.arenaLosses,
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
function WagerCard({ lang, t, f, totalStreak, isGoldTheme, themeMode }: {
    lang: Lang;
    t: any;
    f: any;
    totalStreak: number;
    isGoldTheme?: boolean;
    themeMode: ThemeMode;
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [wager, setWager] = useState<WagerState | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [selectedTier, setSelectedTier] = useState(0);
    const [shardsWager, setShardsWager] = useState(0);
    const [effectiveWagerStakes, setEffectiveWagerStakes] = useState<number[]>(() => WAGER_TIERS.map(tier => tier.betShards));
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
        return (<StatsCardArtSurface name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={16} testID="wager-result-card" style={[{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: wagerBorder }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: resultColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={won ? 'trophy' : 'close-circle'} size={22} color={resultColor}/>
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
              <ShardsInline n={`+${wager.rewardShards}`} size={f.body} textColor={resultColor}/>
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
                    ru: 'Цепочка сорвана · −',
                    uk: 'Ланцюжок зірвано · −',
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
        <TouchableOpacity activeOpacity={0.75} testID="wager-result-new" onPress={() => setWager(null)} style={{ backgroundColor: t.bgSurface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
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
        const netShards = Math.max(0, wager.rewardShards - wager.betShards);
        return (<StatsCardArtSurface name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={18} testID="wager-active-card" style={[{ borderRadius: 18, padding: 14, borderWidth: 1, borderColor: wagerBorder, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
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
          <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: 104 }}>
            <Text style={{ color: wagerAccent, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.35 }}>{wager.rewardShards}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Прогресс пари',
                uk: 'Прогрес парі',
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
          <View style={{ flex: 1, minWidth: 0, backgroundColor: t.bgSurface2, borderRadius: 12, padding: 10 }}>
            <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>
              {triLang(lang, {
                ru: 'ЧИСТЫЙ ПЛЮС',
                uk: 'ЧИСТИЙ ПЛЮС',
                es: 'NETO',
                'pt-BR': "LÍQUIDO",
                vi: "RÒNG",
                id: "NETO",
                tr: "NET",
                pl: "NETTO",
            })}
            </Text>
            <ShardsInline n={`+${netShards}`} size={f.body} textColor={wagerAccent}/>
          </View>
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
        {wagerInfoOpen ? (<View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: statsHairline(themeMode, 'wager'), padding: 10 }}>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 18 }}>
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
    const sel = WAGER_TIERS[clampTierIdx(selectedTier)];
    const effectiveBetShards = effectiveWagerStakes[clampTierIdx(selectedTier)] ?? sel.betShards;
    const canAfford = shardsWager >= effectiveBetShards;
    return (<>
      <TouchableOpacity testID="wager-open" onPress={() => setModalOpen(true)} activeOpacity={0.86}>
        <StatsCardArtSurface testID="wager-open-card" name="wager" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={22} style={[{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: wagerBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'wager') : null]}>
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
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 18, marginTop: 2 }} numberOfLines={2}>
              {triLang(lang, {
            ru: 'Вклад осколками — удержи серию и забери награду',
            uk: 'Внесок осколками — утримай серію й забери нагороду',
            es: 'Aporta fragmentos: mantén la racha y cobra la recompensa',
            'pt-BR': "Aposte fragmentos: mantenha a sequência e receba a recompensa",
            vi: "Đặt mảnh: giữ chuỗi và nhận thưởng",
            id: "Setorkan fragmen: jaga rangkaian dan ambil hadiah",
            tr: "Parça yatır: seriyi koru ve ödülü al",
            pl: "Wpłać odłamki: utrzymaj serię i odbierz nagrodę",
        })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textGhost} style={{ marginTop: 13 }}/>
        </StatsCardArtSurface>
      </TouchableOpacity>

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
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
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

              <ScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.bgSurface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: statsHairline(themeMode, 'wager') }}>
                  <Image source={oskolokImageForPackShards(typeof shardsWager === 'number' ? shardsWager : 0)} style={{ width: 16, height: 16 }} contentFit="contain"/>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{shardsWager}</Text>
                </View>
                <TouchableOpacity
                  testID="wager-close"
                  onPress={closeWagerModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.75}
                  style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface, borderWidth: 1, borderColor: statsHairline(themeMode, 'wager') }}
                >
                  <Ionicons name="close" size={20} color={t.textMuted}/>
                </TouchableOpacity>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 14, lineHeight: 20 }}>
                {triLang(lang, {
            ru: 'Выбери срок и внеси ставку осколками. Удержишь цепочку — получишь прибыль осколками и опыт.',
            uk: 'Обери строк і внеси ставку осколками. Утримаєш ланцюжок — отримаєш прибуток осколками та досвід.',
            es: 'Elige un plazo y aporta fragmentos. Si mantienes la racha, ganas fragmentos netos y XP.',
            'pt-BR': "Escolha um prazo e aposte fragmentos. Se mantiver a sequência, você ganha fragmentos líquidos e XP.",
            vi: "Chọn thời hạn và đặt mảnh. Nếu giữ chuỗi, bạn nhận mảnh ròng và XP.",
            id: "Pilih durasi dan setorkan fragmen. Jika rangkaian terjaga, kamu mendapat fragmen neto dan XP.",
            tr: "Bir süre seç ve parça yatır. Seriyi korursan net parça ve XP kazanırsın.",
            pl: "Wybierz czas i wpłać odłamki. Jeśli utrzymasz serię, zyskasz odłamki netto i XP.",
        })}
              </Text>

              {/* Твой вызов */}
              <View style={{ borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: statsHairline(themeMode, 'wager') }}>
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
            ru: 'Вносишь',
            uk: 'Вносиш',
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
                    <ShardsInline n={`+${sel.rewardShards - effectiveBetShards}`} size={f.body} textColor={wagerAccent}/>
                  </View>
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.label, lineHeight: 16 }}>
                  {triLang(lang, {
            ru: 'Чем длиннее срок, тем выше награда. Выбирай вызов, который действительно сможешь удержать.',
            uk: 'Що довший строк, то вища нагорода. Обирай виклик, який справді зможеш утримати.',
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
                const netShards = tier.rewardShards - stakeToSpend;
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
                            ru: 'Вклад',
                            uk: 'Внесок',
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
                              <Text style={{ color: selected ? wagerAccent : t.textPrimary, fontSize: 13, fontWeight: '800' }}>
                                {`+${netShards} ${triLang(lang, {
                            ru: 'чистыми',
                            uk: 'чистими',
                            es: 'netos',
                            'pt-BR': "líquidos",
                            vi: "ròng",
                            id: "neto",
                            tr: "net",
                            pl: "netto",
                        })}`}
                              </Text>
                            </>) : (<Text style={{ color: t.textGhost, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {triLang(lang, {
                            ru: `Нужно ещё ${deficit} оск.`,
                            uk: `Ще ${deficit} оск.`,
                            es: `Faltan ${deficit} frag.`,
                            'pt-BR': `Faltam ${deficit} frag.`,
                            vi: `Còn thiếu ${deficit} mảnh`,
                            id: `Kurang ${deficit} frag.`,
                            tr: `${deficit} parça eksik`,
                            pl: `Brakuje ${deficit} odł.`,
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
                ru: 'Внести ',
                uk: 'Внести ',
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
                ru: `Награда: +${sel.rewardShards - effectiveBetShards} оск. чистыми · +${sel.rewardXP} опыта`,
                uk: `Нагорода: +${sel.rewardShards - effectiveBetShards} оск. чистими · +${sel.rewardXP} досвіду`,
                es: `Recompensa: +${sel.rewardShards - effectiveBetShards} frag. netos · +${sel.rewardXP} XP`,
                'pt-BR': `Recompensa: +${sel.rewardShards - effectiveBetShards} frag. líquidos · +${sel.rewardXP} XP`,
                vi: `Thưởng: +${sel.rewardShards - effectiveBetShards} mảnh ròng · +${sel.rewardXP} XP`,
                id: `Hadiah: +${sel.rewardShards - effectiveBetShards} frag. neto · +${sel.rewardXP} XP`,
                tr: `Ödül: +${sel.rewardShards - effectiveBetShards} net parça · +${sel.rewardXP} XP`,
                pl: `Nagroda: +${sel.rewardShards - effectiveBetShards} odł. netto · +${sel.rewardXP} XP`,
            })}
                      </Text>
                    </View>) : (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="lock-closed-outline" size={18} color={t.textGhost}/>
                      <Text style={{ color: t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                        {triLang(lang, {
                ru: 'Недостаточно осколков',
                uk: 'Недостатньо осколків',
                es: 'No tienes suficientes fragmentos',
                'pt-BR': "Você não tem fragmentos suficientes",
                vi: "Bạn không có đủ mảnh",
                id: "Fragmen kamu tidak cukup",
                tr: "Yeterli parçan yok",
                pl: "Nie masz wystarczająco odłamków",
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
            ru: 'Недостаточно осколков',
            uk: 'Недостатньо осколків',
            es: 'No tienes suficientes fragmentos',
            'pt-BR': "Você não tem fragmentos suficientes",
            vi: "Bạn không có đủ mảnh",
            id: "Fragmen kamu tidak cukup",
            tr: "Yeterli parçan yok",
            pl: "Nie masz wystarczająco odłamków",
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
                ru: 'осколков',
                uk: 'осколків',
                es: 'fragmentos',
                'pt-BR': "fragmentos",
                vi: "mảnh",
                id: "fragmen",
                tr: "parça",
                pl: "odłamków",
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
                ru: 'Вклад:',
                uk: 'Внесок:',
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <Text style={{ color: t.textMuted, fontSize: f.body }}>
                      {triLang(lang, {
                ru: 'К балансу',
                uk: 'До балансу',
                es: 'Al saldo',
                'pt-BR': "Ao saldo",
                vi: "Vào số dư",
                id: "Ke saldo",
                tr: "Bakiyeye",
                pl: "Do salda",
            })}
                    </Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      +{sel.rewardShards - effectiveBetShards}
                    </Text>
                    <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                      {triLang(lang, {
                ru: `(начислим +${sel.rewardShards}; твой вклад уже учтен)`,
                uk: `(зарахуємо +${sel.rewardShards}; твій внесок уже враховано)`,
                es: `(abonamos +${sel.rewardShards}; tu aporte ya está contado)`,
                'pt-BR': `(creditamos +${sel.rewardShards}; sua aposta já está contada)`,
                vi: `(cộng +${sel.rewardShards}; phần đặt của bạn đã được tính)`,
                id: `(kami tambahkan +${sel.rewardShards}; setoranmu sudah dihitung)`,
                tr: `(+${sel.rewardShards} ekliyoruz; yatırdığın miktar zaten sayıldı)`,
                pl: `(dopisujemy +${sel.rewardShards}; twoja wpłata jest już uwzględniona)`,
            })}
                    </Text>
                  </View>
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
                ru: 'Собьёшь цепочку → потеряешь ',
                uk: 'Зірвеш ланцюжок → втратиш ',
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
            ru: 'Внести',
            uk: 'Внести',
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
            setWagerConfirm(false);
            void doPlace();
        }}/>
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
        borderWidth: 1,
        borderColor: streakFreezeIconVariant.borderColor,
        shadowColor: streakFreezeIconVariant.accentColor,
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
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
    return (<StatsCardArtSurface name="streak" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={luxuryLocations} radius={cardRadius} scrim={freezeActive ? 'strong' : 'medium'} style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 1, borderColor: isGoldTheme ? (freezeActive ? GOLD_RICH.hairlineStrong : goldHairline) : statsBorder(themeMode, heroTone, 'medium'), overflow: 'hidden' }, luxuryShadow ?? statsGlowStyle(themeMode, heroTone)]}>
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
                const _p = lang === 'uk' ? _uk : lang === 'es' ? _es : _ru;
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
                    isToday && !done && { backgroundColor: streakDotSoftBg, borderWidth: 2, borderColor: streakAccent },
                ]}/>
              <Text style={{ color: isToday ? t.textPrimary : (done ? t.textPrimary : t.textGhost), fontSize: 12, fontWeight: isToday ? '700' : '600' }}>{d}</Text>
            </View>);
        })}
      </View>
      {visibleStreakPercentile !== null && (<View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: isGoldTheme ? goldSoftBg : statsSoftBg(themeMode, 'streak', 'quiet'), borderRadius: 10,
                padding: 10, marginTop: 10,
                borderWidth: 0.5, borderColor: isGoldTheme ? goldHairline : statsHairline(themeMode, 'streak'),
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
                ru: `Заморозка активна: ${chainShieldDays} дней`,
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
        {reviveOffer && (<TouchableOpacity onPress={onRevivePress} activeOpacity={0.86} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: reviveAccent, paddingVertical: 11, paddingHorizontal: 16, marginBottom: 8, backgroundColor: isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'streak', 'quiet') }}>
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
                ru: `${reviveOffer.lostStreak} дн. доступны сегодня`,
                uk: `${reviveOffer.lostStreak} дн. доступні сьогодні`,
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
          </View>) : (<TouchableOpacity activeOpacity={0.75} onPress={onFreezePress} disabled={chainShieldDays > 0} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: streakAccent, paddingVertical: 11, paddingHorizontal: 16, opacity: chainShieldDays > 0 ? 0.4 : 1 }}>
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
                        ru: 'Бесплатно (Премиум)',
                        uk: 'Безкоштовно (Преміум)',
                        es: 'Gratis (Premium)',
                        'pt-BR': "Grátis (Premium)",
                        vi: "Miễn phí (Premium)",
                        id: "Gratis (Premium)",
                        tr: "Ücretsiz (Premium)",
                        pl: "Gratis (Premium)",
                    })
                    : triLang(lang, {
                        ru: 'Нужен Премиум',
                        uk: 'Потрібен Преміум',
                        es: 'Se necesita Premium',
                        'pt-BR': "Precisa de Premium",
                        vi: "Cần Premium",
                        id: "Perlu Premium",
                        tr: "Premium gerekli",
                        pl: "Wymagane Premium",
                    })}
                </Text>)}
            </View>
            {!isPremium && <Ionicons name="lock-closed-outline" size={16} color={t.textGhost}/>}
          </TouchableOpacity>)}
      </View>
    </StatsCardArtSurface>);
}
function LearningCoachCard({ t, f, lang, metrics, isGoldTheme, themeMode, showAction, onAction, }: {
    t: any;
    f: any;
    lang: Lang;
    metrics: LearningCoachMetrics;
    isGoldTheme: boolean;
    themeMode: ThemeMode;
    showAction: boolean;
    onAction: () => void;
}) {
    const scoreAccent = isGoldTheme ? GOLD_RICH.champagne : metrics.scoreColor;
    const scoreSoftBg = isGoldTheme ? GOLD_RICH.wash : metrics.scoreColor + '24';
    const scoreBorder = isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'practiceBalance', 'medium');
    const daysToGoodRhythm = Math.max(0, 5 - metrics.active7);
    const rhythmValue = metrics.isWarmup
        ? triLang(lang, {
            ru: `${metrics.active7} дн.`,
            uk: `${metrics.active7} дн.`,
            es: `${metrics.active7} d.`,
            'pt-BR': `${metrics.active7} d.`,
            vi: `${metrics.active7} ngày`,
            id: `${metrics.active7} h`,
            tr: `${metrics.active7} g.`,
            pl: `${metrics.active7} d.`,
        })
        : daysToGoodRhythm === 0
        ? triLang(lang, {
            ru: 'ровно',
            uk: 'рівно',
            es: 'estable',
            'pt-BR': "estável",
            vi: "ổn định",
            id: "stabil",
            tr: "istikrarlı",
            pl: "stabilnie",
        })
        : triLang(lang, {
            ru: `+${daysToGoodRhythm} дн.`,
            uk: `+${daysToGoodRhythm} дн.`,
            es: `+${daysToGoodRhythm} d.`,
            'pt-BR': `+${daysToGoodRhythm} d.`,
            vi: `+${daysToGoodRhythm} ngày`,
            id: `+${daysToGoodRhythm} h`,
            tr: `+${daysToGoodRhythm} g.`,
            pl: `+${daysToGoodRhythm} d.`,
        });
    const focusValue = metrics.isWarmup
        ? metrics.avgMinutesActive >= 12
            ? triLang(lang, {
                ru: metrics.active7 <= 1 ? '1 длинный день' : 'длинные',
                uk: metrics.active7 <= 1 ? '1 довгий день' : 'довгі',
                es: metrics.active7 <= 1 ? '1 día largo' : 'largas',
                'pt-BR': metrics.active7 <= 1 ? "1 dia longo" : "longas",
                vi: metrics.active7 <= 1 ? "1 ngày dài" : "dài",
                id: metrics.active7 <= 1 ? "1 hari panjang" : "panjang",
                tr: metrics.active7 <= 1 ? "1 uzun gün" : "uzun",
                pl: metrics.active7 <= 1 ? "1 długi dzień" : "długie",
            })
            : metrics.avgMinutesActive >= 5
                ? triLang(lang, {
                    ru: 'набираются',
                    uk: 'набираються',
                    es: 'crecen',
                    'pt-BR': "crescendo",
                    vi: "đang tăng",
                    id: "mulai naik",
                    tr: "artıyor",
                    pl: "rosną",
                })
                : triLang(lang, {
                    ru: 'короткие',
                    uk: 'короткі',
                    es: 'cortas',
                    'pt-BR': "curtas",
                    vi: "ngắn",
                    id: "pendek",
                    tr: "kısa",
                    pl: "krótkie",
                })
        : metrics.avgMinutesActive >= 12
        ? triLang(lang, {
            ru: 'достаточно',
            uk: 'достатньо',
            es: 'bien',
            'pt-BR': "bem",
            vi: "ổn",
            id: "baik",
            tr: "iyi",
            pl: "dobrze",
        })
        : humanMinutes(metrics.avgMinutesActive, lang);
    const streakValue = metrics.isWarmup
        ? triLang(lang, {
            ru: `${metrics.totalStreak} дн.`,
            uk: `${metrics.totalStreak} дн.`,
            es: `${metrics.totalStreak} d.`,
            'pt-BR': `${metrics.totalStreak} d.`,
            vi: `${metrics.totalStreak} ngày`,
            id: `${metrics.totalStreak} h`,
            tr: `${metrics.totalStreak} g.`,
            pl: `${metrics.totalStreak} d.`,
        })
        : metrics.totalStreak > 0
        ? triLang(lang, {
            ru: 'держится',
            uk: 'тримається',
            es: 'activa',
            'pt-BR': "ativa",
            vi: "đang hoạt động",
            id: "aktif",
            tr: "aktif",
            pl: "aktywna",
        })
        : triLang(lang, {
            ru: 'сегодня',
            uk: 'сьогодні',
            es: 'hoy',
            'pt-BR': "hoje",
            vi: "hôm nay",
            id: "hari ini",
            tr: "bugün",
            pl: "dziś",
        });
    const learningSignals = [
        {
            icon: 'calendar-outline' as const,
            label: triLang(lang, {
                ru: 'Частота',
                uk: 'Частота',
                es: 'Frecuencia',
                'pt-BR': "Frequência",
                vi: "Tần suất",
                id: "Frekuensi",
                tr: "Sıklık",
                pl: "Częstotliwość",
            }),
            value: rhythmValue,
            hint: metrics.isWarmup
                ? triLang(lang, {
                    ru: `Записано активных дней: ${metrics.active7}.`,
                    uk: `Записано активних днів: ${metrics.active7}.`,
                    es: `Días activos registrados: ${metrics.active7}.`,
                    'pt-BR': `Dias ativos registrados: ${metrics.active7}.`,
                    vi: `Số ngày hoạt động đã ghi: ${metrics.active7}.`,
                    id: `Hari aktif tercatat: ${metrics.active7}.`,
                    tr: `Kaydedilen aktif gün: ${metrics.active7}.`,
                    pl: `Zapisane aktywne dni: ${metrics.active7}.`,
                })
                : daysToGoodRhythm === 0
                ? triLang(lang, {
                    ru: 'На этой неделе хватает регулярности.',
                    uk: 'Цього тижня регулярності вистачає.',
                    es: 'Esta semana hay buena regularidad.',
                    'pt-BR': "Esta semana há boa regularidade.",
                    vi: "Tuần này có độ đều tốt.",
                    id: "Minggu ini cukup teratur.",
                    tr: "Bu hafta düzenlilik iyi.",
                    pl: "W tym tygodniu regularność jest dobra.",
                })
                : triLang(lang, {
                    ru: `Еще ${daysToGoodRhythm} активн. дн. до спокойного темпа.`,
                    uk: `Ще ${daysToGoodRhythm} акт. дн. до спокійного темпу.`,
                    es: `${daysToGoodRhythm} d. más para un ritmo cómodo.`,
                    'pt-BR': `${daysToGoodRhythm} d. a mais para um ritmo confortável.`,
                    vi: `Thêm ${daysToGoodRhythm} ngày để có nhịp thoải mái.`,
                    id: `${daysToGoodRhythm} h lagi untuk ritme nyaman.`,
                    tr: `Rahat bir ritim için ${daysToGoodRhythm} gün daha.`,
                    pl: `Jeszcze ${daysToGoodRhythm} dni do wygodnego rytmu.`,
                }),
        },
        {
            icon: 'time-outline' as const,
            label: triLang(lang, {
                ru: 'Длина занятий',
                uk: 'Довжина занять',
                es: 'Duración',
                'pt-BR': "Duração",
                vi: "Thời lượng",
                id: "Durasi",
                tr: "Süre",
                pl: "Czas trwania",
            }),
            value: focusValue,
            hint: metrics.isWarmup
                ? triLang(lang, {
                    ru: `Срез: ${metrics.active7} активн. дн., средняя длина ${humanMinutes(metrics.avgMinutesActive, lang)}. Это еще не финальная оценка.`,
                    uk: `Зріз: ${metrics.active7} акт. дн., середня довжина ${humanMinutes(metrics.avgMinutesActive, lang)}. Це ще не фінальна оцінка.`,
                    es: `Corte: ${metrics.active7} d. activos, media ${humanMinutes(metrics.avgMinutesActive, lang)}. Aún no es una evaluación final.`,
                    'pt-BR': `Recorte: ${metrics.active7} d. ativos, média ${humanMinutes(metrics.avgMinutesActive, lang)}. Ainda não é uma avaliação final.`,
                    vi: `Lát cắt: ${metrics.active7} ngày hoạt động, trung bình ${humanMinutes(metrics.avgMinutesActive, lang)}. Đây chưa phải đánh giá cuối.`,
                    id: `Cuplikan: ${metrics.active7} h aktif, rata-rata ${humanMinutes(metrics.avgMinutesActive, lang)}. Ini belum penilaian akhir.`,
                    tr: `Kesit: ${metrics.active7} aktif gün, ortalama ${humanMinutes(metrics.avgMinutesActive, lang)}. Bu henüz son değerlendirme değil.`,
                    pl: `Przekrój: ${metrics.active7} aktyw. dni, średnio ${humanMinutes(metrics.avgMinutesActive, lang)}. To jeszcze nie jest końcowa ocena.`,
                })
                : metrics.avgMinutesActive >= 12
                ? triLang(lang, {
                    ru: 'Сессии уже не слишком короткие.',
                    uk: 'Сесії вже не надто короткі.',
                    es: 'Las sesiones ya tienen buen tamaño.',
                    'pt-BR': "As sessões já têm um bom tamanho.",
                    vi: "Các buổi học đã có độ dài tốt.",
                    id: "Sesi sudah punya durasi yang baik.",
                    tr: "Seansların uzunluğu iyi.",
                    pl: "Sesje mają już dobrą długość.",
                })
                : triLang(lang, {
                    ru: 'Цель: около 10-12 минут за подход.',
                    uk: 'Ціль: близько 10-12 хвилин за підхід.',
                    es: 'Meta: unos 10-12 minutos por sesión.',
                    'pt-BR': "Meta: cerca de 10-12 minutos por sessão.",
                    vi: "Mục tiêu: khoảng 10-12 phút mỗi buổi.",
                    id: "Target: sekitar 10-12 menit per sesi.",
                    tr: "Hedef: seans başına yaklaşık 10-12 dakika.",
                    pl: "Cel: około 10-12 minut na sesję.",
                }),
        },
        {
            icon: 'flame-outline' as const,
            label: triLang(lang, {
                ru: 'Серия',
                uk: 'Серія',
                es: 'Racha',
                'pt-BR': "Sequência",
                vi: "Chuỗi",
                id: "Rangkaian",
                tr: "Seri",
                pl: "Seria",
            }),
            value: streakValue,
            hint: metrics.isWarmup
                ? triLang(lang, {
                    ru: `Текущая серия: ${metrics.totalStreak} дн.`,
                    uk: `Поточна серія: ${metrics.totalStreak} дн.`,
                    es: `Racha actual: ${metrics.totalStreak} d.`,
                    'pt-BR': `Sequência atual: ${metrics.totalStreak} d.`,
                    vi: `Chuỗi hiện tại: ${metrics.totalStreak} ngày.`,
                    id: `Rangkaian saat ini: ${metrics.totalStreak} h.`,
                    tr: `Mevcut seri: ${metrics.totalStreak} g.`,
                    pl: `Obecna seria: ${metrics.totalStreak} d.`,
                })
                : metrics.totalStreak > 0
                ? triLang(lang, {
                    ru: `${metrics.totalStreak} дн. подряд поддерживают привычку.`,
                    uk: `${metrics.totalStreak} дн. поспіль підтримують звичку.`,
                    es: `${metrics.totalStreak} d. seguidos sostienen el hábito.`,
                    'pt-BR': `${metrics.totalStreak} d. seguidos sustentam o hábito.`,
                    vi: `${metrics.totalStreak} ngày liên tiếp đang giữ thói quen.`,
                    id: `${metrics.totalStreak} h berturut-turut menopang kebiasaan.`,
                    tr: `${metrics.totalStreak} gün üst üste alışkanlığı destekliyor.`,
                    pl: `${metrics.totalStreak} dni z rzędu podtrzymuje nawyk.`,
                })
                : triLang(lang, {
                    ru: 'Одной короткой практики хватит для старта.',
                    uk: 'Однієї короткої практики вистачить для старту.',
                    es: 'Una práctica corta basta para empezar.',
                    'pt-BR': "Uma prática curta basta para começar.",
                    vi: "Một buổi luyện ngắn là đủ để bắt đầu.",
                    id: "Latihan singkat cukup untuk memulai.",
                    tr: "Başlamak için kısa bir pratik yeter.",
                    pl: "Krótka praktyka wystarczy na start.",
                }),
        },
    ];
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    return (<StatsCardArtSurface name="practiceBalance" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} testID="stats-learning-health-card" style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 1, borderColor: scoreBorder, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'practiceBalance')]}>
      {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <StatScoreRing
          progress={metrics.isWarmup ? Math.min(100, (metrics.active7 / 5) * 100) : metrics.score}
          centerValue={metrics.isWarmup ? metrics.active7 : metrics.score}
          centerSubLabel={metrics.scoreSubLabel}
          accent={scoreAccent}
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : metrics.scoreColor + 'B0'}
          trackColor={isGoldTheme ? GOLD_RICH.bronzeWash : statsSoftBg(themeMode, 'practiceBalance', 'quiet')}
          size={104}
          strokeWidth={10}
          centerColor={t.textPrimary}
          subColor={t.textMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: scoreAccent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {triLang(lang, {
            ru: 'Баланс практики',
            uk: 'Баланс практики',
            es: 'Balance de práctica',
            'pt-BR': "Balanço da prática",
            vi: "Cân bằng luyện tập",
            id: "Keseimbangan latihan",
            tr: "Pratik dengesi",
            pl: "Bilans ćwiczenia",
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

      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 16, marginBottom: 10 }}>
        {triLang(lang, {
            ru: 'Что поможет сейчас',
            uk: 'Що допоможе зараз',
            es: 'Qué ayuda ahora',
            'pt-BR': "O que ajuda agora",
            vi: "Điều giúp ích lúc này",
            id: "Yang membantu sekarang",
            tr: "Şimdi ne yardımcı olur",
            pl: "Co teraz pomaga",
        })}
      </Text>
      {/* Bento 3-up: Частота / Длина / Серия — каждый сигнал крупной плиткой
          с воздухом вместо тесной строки со скрытым хинтом. */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {learningSignals.map((item) => (<View key={item.label} style={{ flex: 1, minWidth: 0, minHeight: 104, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance'), alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={item.icon} size={18} color={scoreAccent}/>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center', lineHeight: f.body * 1.2 }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55}>
              {item.value}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '800', textAlign: 'center', marginTop: 'auto', textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
              {item.label}
            </Text>
          </View>))}
      </View>

      {showAction ? (<View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance') }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color={scoreAccent}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>{metrics.actionTitle}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 4 }}>{metrics.actionBody}</Text>
            </View>
          </View>
          <TouchableOpacity testID="stats-today-action" onPress={onAction} activeOpacity={0.86} style={{ marginTop: 12, borderRadius: 13, paddingVertical: 12, alignItems: 'center', backgroundColor: scoreAccent }}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{metrics.actionCta}</Text>
          </TouchableOpacity>
        </View>) : null}
    </StatsCardArtSurface>);
}
function RhythmWeekCard({ t, f, lang, metrics, isGoldTheme, themeMode, }: {
    t: any;
    f: any;
    lang: Lang;
    metrics: LearningCoachMetrics;
    isGoldTheme: boolean;
    themeMode: ThemeMode;
}) {
    const scoreAccent = isGoldTheme ? GOLD_RICH.paleGold : metrics.scoreColor;
    const scoreSoftBg = isGoldTheme ? GOLD_RICH.wash : metrics.scoreColor + '24';
    const scoreBorder = isGoldTheme ? GOLD_RICH.hairline : statsBorder(themeMode, 'weekRhythm', 'medium');
    const maxCombined = Math.max(1, ...metrics.rhythmDays.map((d) => d.combined));
    const facts = [
        {
            icon: 'calendar-outline' as const,
            label: triLang(lang, {
                ru: 'Неделя',
                uk: 'Тиждень',
                es: 'Semana',
                'pt-BR': "Semana",
                vi: "Tuần",
                id: "Minggu",
                tr: "Hafta",
                pl: "Tydzień",
            }),
            value: `${metrics.active7}/7`,
            hint: triLang(lang, {
                ru: 'Сколько дней реально была практика.',
                uk: 'Скільки днів реально була практика.',
                es: 'Días con práctica real.',
                'pt-BR': "Dias com prática real.",
                vi: "Ngày có luyện tập thật.",
                id: "Hari dengan latihan nyata.",
                tr: "Gerçek pratik yapılan günler.",
                pl: "Dni z prawdziwym ćwiczeniem.",
            }),
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
            hint: streakWeeklyTimeTotalHint(lang, metrics.minutes7),
        },
        {
            icon: 'flash-outline' as const,
            label: streakWeeklyExperienceLabel(lang),
            value: String(metrics.xp7),
            hint: streakWeeklyExperienceHint(lang),
        },
    ];
    const cardRadius = statsSurfaceRadius(themeMode, isGoldTheme ? 16 : 22);
    return (<StatsCardArtSurface name="weekRhythm" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={cardRadius} testID="stats-rhythm-week-card" style={[{ borderRadius: cardRadius, padding: 16, borderWidth: 1, borderColor: scoreBorder, overflow: 'hidden' }, isGoldTheme ? goldShadow(2) : statsGlowStyle(themeMode, 'weekRhythm')]}>
      {isGoldTheme && <GoldBevel radius={16} intensity="normal"/>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {triLang(lang, {
            ru: 'Ритм недели',
            uk: 'Ритм тижня',
            es: 'Ritmo semanal',
            'pt-BR': "Ritmo semanal",
            vi: "Nhịp tuần",
            id: "Ritme mingguan",
            tr: "Haftalık ritim",
            pl: "Rytm tygodnia",
        })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h3 ?? f.bodyLg, fontWeight: '900', marginTop: 3 }}>
            {metrics.rhythmSummary}
          </Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="pulse" size={23} color={scoreAccent}/>
        </View>
      </View>

      <View style={{ marginBottom: 14, borderRadius: 16, padding: 12, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'weekRhythm') }}>
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
          accentSoft={isGoldTheme ? GOLD_RICH.paleGold : metrics.scoreColor + 'CC'}
          inactiveColor={statsSoftBg(themeMode, 'weekRhythm', 'quiet')}
          todayDotColor={scoreAccent}
          height={88}
          topLabelColor={t.textPrimary}
          topLabelMutedColor={t.textGhost}
          bottomLabelColor={t.textPrimary}
          bottomLabelMutedColor={t.textMuted}
        />
      </View>

      {/* Bento 3-up: Неделя / Время / Опыт — единый язык с «Балансом практики». */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {facts.map((item) => (<View key={item.label} style={{ flex: 1, minWidth: 0, minHeight: 96, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'weekRhythm'), alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: scoreSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={item.icon} size={18} color={scoreAccent}/>
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', textAlign: 'center', lineHeight: f.body * 1.2 }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55}>
              {item.value}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 9.5, fontWeight: '800', textAlign: 'center', marginTop: 'auto', textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
              {item.label}
            </Text>
          </View>))}
      </View>
    </StatsCardArtSurface>);
}
export default function StreakStats() {
    const router = useRouter();
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
    const [totalStreak, setTotalStreak] = useState(_sc.totalStreak);
    const [bestStreak, setBestStreak] = useState(_sc.bestStreak);
    const [, setTotalPoints] = useState(_sc.totalPoints);
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
    const [, setStreakAtRisk] = useState(_sc.streakAtRisk);
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
    const [trainerPracticeDue, setTrainerPracticeDue] = useState(_sc.trainerPracticeDue);
    const [achievementCount, setAchievementCount] = useState(0);
    const [pendingGiftCount, setPendingGiftCount] = useState(_sc.pendingGiftCount);
    const [collectiblesOwned, setCollectiblesOwned] = useState(0);
    const [collectiblesUnseen, setCollectiblesUnseen] = useState(0);
    const [freezeConfirmVisible, setFreezeConfirmVisible] = useState(false);
    const [freezeNeedShardsModal, setFreezeNeedShardsModal] = useState(false);
    const [reviveOffer, setReviveOffer] = useState<StreakReviveOffer | null>(null);
    const [reviveModalVisible, setReviveModalVisible] = useState(false);
    const [bonusOpen, setBonusOpen] = useState(true);
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
            if (!cancelled)
                setAchievementCount(states.filter(s => s.unlockedAt !== null).length);
        })
            .catch(() => {
            if (!cancelled)
                setAchievementCount(0);
        });
        return () => { cancelled = true; };
    }, []));
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void readPendingLevelGiftCountCache()
            .then(count => {
            if (!cancelled && count > 0)
                setPendingGiftCount(count);
        })
            .catch(() => { });
        void loadPendingLevelGiftCount()
            .then(count => {
            if (!cancelled)
                setPendingGiftCount(count);
        })
            .catch(() => {
            // Keep the last known value on transient storage errors to avoid a visible zero flash.
        });
        return () => { cancelled = true; };
    }, []));
    useFocusEffect(useCallback(() => {
        let cancelled = false;
        void getCollectiblesProgress()
            .then(({ owned }) => { if (!cancelled) setCollectiblesOwned(owned); })
            .catch(() => { });
        void getCollectiblesUnseenCount()
            .then(count => { if (!cancelled) setCollectiblesUnseen(count); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []));
    const scrollRef = useRef<any>(null);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const chartScrollRef = useRef<any>(null);
    /** «Опыт» | «Время» — один блок графика по дням. */
    const [dailyChartTab, setDailyChartTab] = useState<'xp' | 'time'>('xp');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const today = toDateStr(new Date());
    const [lifetimeStats, setLifetimeStats] = useState<LifetimeProfileStats | null>(null);
    const [percentiles, setPercentiles] = useState<AllPercentiles>({ xp: null, streak: null, weekXp: null, daily7xp: null, daily7timeMs: null, arenaXp: null, totalUsers: 0 });
    const [myXp7, setMyXp7] = useState(0);
    const [myTime7ms, setMyTime7ms] = useState(0);
    // ИИ-микротексты под блоками (premium, ленивая генерация — см. stats_insights_client).
    const [aiNotes, setAiNotes] = useState<StatsInsightsNotes | null>(null);
    const [aiNotesLoading, setAiNotesLoading] = useState(false);
    const coachMetrics = useMemo(() => buildLearningCoachMetrics(allDays.length > 0 ? allDays : days, allTimeDays, totalStreak, lang), [allDays, days, allTimeDays, totalStreak, lang]);
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
    const activity365YRef = useRef<number | null>(null);
    const params = useLocalSearchParams<{
        qa365?: string;
    }>();
    useEffect(() => {
        if (params.qa365 !== '1')
            return;
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            const y = activity365YRef.current;
            if (typeof y === 'number') {
                scrollRef.current?.scrollTo?.({ x: 0, y: Math.max(0, y - 12), animated: true });
                clearInterval(timer);
                return;
            }
            if (attempts >= 20)
                clearInterval(timer);
        }, 250);
        return () => clearInterval(timer);
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
        setTotalPoints(snapshot.totalPoints);
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
        setTrainerPracticeDue(snapshot.trainerPracticeDue);
        setPendingGiftCount(snapshot.pendingGiftCount);
    }, [wdays]);
    const loadAll = React.useCallback(async () => {
        debugStatsRoute('loadAll:start');
        await hydrateStatsCacheFromStorage();
        const cachedSnapshot = getStatsCache(studyTarget);
        debugStatsRoute('loadAll:cache', { loaded: cachedSnapshot.loaded });
        if (cachedSnapshot.loaded)
            applyStatsSnapshot(cachedSnapshot);
        try {
            const cachedLifetime = await readLifetimeProfileStatsCache();
            debugStatsRoute('loadAll:lifetimeCache', { ok: !!cachedLifetime });
            if (cachedLifetime)
                setLifetimeStats(cachedLifetime);
        }
        catch { /* ignore */ }
        const lifetimeRefresh = loadLifetimeProfileStats()
            .then((stats) => {
            debugStatsRoute('loadAll:lifetimeRefresh', { ok: !!stats });
            setLifetimeStats(stats);
        })
            .catch((error) => { debugStatsRoute('loadAll:lifetimeRefreshError', String(error)); });
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
        await lifetimeRefresh;
        // Синк аналитики + перцентиль (не блокирует рендер — запускаем после основной загрузки)
        void syncDailyAnalyticsIfNeeded();
        loadPercentileData().then(({ myXp7: x7, myTime7ms: t7, percentiles: p }) => {
            debugStatsRoute('loadAll:percentiles', { x7, t7, xp: p.xp, weekXp: p.weekXp, daily7xp: p.daily7xp, daily7timeMs: p.daily7timeMs });
            setMyXp7(x7);
            setMyTime7ms(t7);
            setPercentiles(p);
        }).catch((error) => { debugStatsRoute('loadAll:percentilesError', String(error)); });
    }, [applyStatsSnapshot, studyTarget]);
    // Reload data when screen regains focus (e.g. after tester functions).
    useFocusEffect(React.useCallback(() => {
        void loadAll();
        return undefined;
    }, [loadAll]));
    // ── ИИ-микротексты под блоками ──────────────────────────────────────────
    // 1) Мгновенно показываем кэш. 2) Только для premium и только когда данные
    //    загружены — ленивая генерация (серверное окно 3 дня не даст частить).
    useFocusEffect(React.useCallback(() => {
        let cancelled = false;
        void (async () => {
            const cached = await getStatsInsightsState(studyTarget, Date.now(), lang);
            if (!cancelled && cached.kind === 'cached') setAiNotes(cached.notes);
        })();
        return () => { cancelled = true; };
    }, [studyTarget, lang]));
    React.useEffect(() => {
        if (!isPremium || !lifetimeStats) return; // фича premium-only; ждём данные
        let cancelled = false;
        void (async () => {
            try {
                const activity = await loadActivity365Analytics().catch(() => null);
                const briefing: StatsInsightsBriefing = {
                    lang,
                    studyTarget,
                    balance: {
                        score: coachMetrics.score,
                        isWarmup: coachMetrics.isWarmup,
                        active7: coachMetrics.active7,
                        avgMinutes: Math.round(coachMetrics.avgMinutesActive),
                    },
                    rhythm: {
                        active7: coachMetrics.active7,
                        xp7: coachMetrics.xp7,
                        minutes7: Math.round(coachMetrics.minutes7),
                        bestDay: coachMetrics.bestDayLabel ?? '',
                    },
                    year: {
                        activeDays: activity?.activeDays ?? 0,
                        currentStreak: activity?.currentStreak ?? totalStreak,
                        longestStreak: activity?.longestStreak ?? 0,
                        bestMonth: '',
                        goalPct: activity?.goal ? Math.round((activity.goal.activeDays / Math.max(1, activity.goal.goal)) * 100) : 0,
                    },
                    percentiles: {
                        totalXp: percentiles.xp,
                        week: percentiles.weekXp,
                        daily7: myXp7 > 0 ? percentiles.daily7xp : null,
                    },
                    lifetime: {
                        words: lifetimeStats.wordsLearned,
                        phrases: lifetimeStats.phrasesLearned,
                        quizzes: lifetimeStats.quizzesTotal,
                        arenaWins: lifetimeStats.arenaWins,
                        daysActive: lifetimeStats.appDaysUnion,
                    },
                    weakCategories: [],
                };
                if (!cancelled) setAiNotesLoading(true);
                // QA-сценарий (qa365=1) форсит регенерацию, минуя локальный гейт.
                const state = await generateStatsInsights({ briefing, isPremium, force: params.qa365 === '1' });
                if (cancelled) return;
                if (state.kind === 'cached') setAiNotes(state.notes);
                else if (state.kind === 'error' && state.notes) setAiNotes(state.notes);
            } finally {
                if (!cancelled) setAiNotesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    // Намеренно зависим только от ключевых сигналов, не от каждого числа —
    // генерацию всё равно гейтит серверное окно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPremium, !!lifetimeStats, studyTarget, lang]);
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
            void loadAll();
        });
        return () => sub.remove();
    }, [loadAll]);
    // Таймер обратного отсчёта для клубного буста XP
    useEffect(() => {
        if (!clubBoostExpiresAt || clubBoostMultiplier <= 1) {
            setClubBoostTimeLeft('');
            return;
        }
        const fmt = () => {
            const ms = clubBoostExpiresAt - Date.now();
            if (ms <= 0) {
                setClubBoostTimeLeft('');
                setClubBoostMultiplier(1);
                return;
            }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            setClubBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2, '0')}м` : `${m}м ${s.toString().padStart(2, '0')}с`);
        };
        fmt();
        const timer = setInterval(fmt, 1000);
        return () => clearInterval(timer);
    }, [clubBoostExpiresAt, clubBoostMultiplier]);
    // Таймер обратного отсчёта для персонального буста лиги
    useEffect(() => {
        if (!leagueBoostExpiresAt || leagueBoostMultiplier <= 1) {
            setLeagueBoostTimeLeft('');
            return;
        }
        const fmt = () => {
            const ms = leagueBoostExpiresAt - Date.now();
            if (ms <= 0) {
                setLeagueBoostTimeLeft('');
                setLeagueBoostMultiplier(1);
                return;
            }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            setLeagueBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2, '0')}м` : `${m}м ${s.toString().padStart(2, '0')}с`);
        };
        fmt();
        const timer = setInterval(fmt, 1000);
        return () => clearInterval(timer);
    }, [leagueBoostExpiresAt, leagueBoostMultiplier]);
    // Timer for the shared league boost shown in active multipliers.
    useEffect(() => {
        if (!leagueGroupBoostExpiresAt || leagueGroupBoostMultiplier <= 1) {
            setLeagueGroupBoostTimeLeft('');
            return;
        }
        const fmt = () => {
            const ms = leagueGroupBoostExpiresAt - Date.now();
            if (ms <= 0) {
                setLeagueGroupBoostTimeLeft('');
                setLeagueGroupBoostMultiplier(1);
                return;
            }
            setLeagueGroupBoostTimeLeft(formatLeagueGroupBoostTimeLeft(leagueGroupBoostExpiresAt));
        };
        fmt();
        const timer = setInterval(fmt, 1000);
        return () => clearInterval(timer);
    }, [leagueGroupBoostExpiresAt, leagueGroupBoostMultiplier]);
    // Таймер обратного отсчёта для подарочного множителя XP
    useEffect(() => {
        if (!giftExpiresAt || giftMultiplier <= 1) {
            setGiftTimeLeft('');
            return;
        }
        const fmt = () => {
            const ms = giftExpiresAt - Date.now();
            if (ms <= 0) {
                setGiftTimeLeft('');
                setGiftMultiplier(1);
                return;
            }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            setGiftTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2, '0')}м` : `${m}м ${s.toString().padStart(2, '0')}с`);
        };
        fmt();
        const timer = setInterval(fmt, 1000);
        return () => clearInterval(timer);
    }, [giftExpiresAt, giftMultiplier]);
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
    };
    // ИИ-заметка под карточкой `block`. Premium → текст Тео; free → тизер на пейвол.
    const renderAiNote = (block: keyof StatsInsightsNotes, tone: StatsChromeTone) => {
        const note = aiNotes?.[block];
        // Free без текста и без загрузки прячем целиком, кроме случая «есть что показать».
        if (!isPremium && !note && !aiNotesLoading) {
            // Тизер показываем только под «Балансом» (первый блок), чтобы не спамить пейволом.
            if (block !== 'balance') return null;
        } else if (isPremium && !note && !aiNotesLoading) {
            return null;
        }
        const accent = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, tone);
        return (<AiBlockNote
          note={note}
          isPremium={isPremium}
          loading={aiNotesLoading}
          accent={accent}
          softBg={isGoldTheme ? GOLD_RICH.blackPiano : statsSoftBg(themeMode, tone, 'quiet')}
          borderColor={isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, tone)}
          textColor={t.textPrimary}
          mutedColor={t.textMuted}
          authorLabel={triLang(lang, { ru: 'Компас', uk: 'Компас', es: 'Compass', 'pt-BR': 'Compass', vi: 'Compass', id: 'Compass', tr: 'Compass', pl: 'Compass' })}
          lockedLabel={triLang(lang, { ru: 'Открой подсказки Компаса с Premium', uk: 'Відкрий підказки Компаса з Premium', es: 'Desbloquea las pistas de Compass con Premium', 'pt-BR': 'Desbloqueie as dicas do Compass com Premium', vi: 'Mở gợi ý Compass với Premium', id: 'Buka petunjuk Compass dengan Premium', tr: 'Compass ipuçlarını Premium ile aç', pl: 'Odblokuj wskazówki Compass z Premium' })}
          loadingLabel={triLang(lang, { ru: 'Компас готовит подсказку…', uk: 'Компас готує підказку…', es: 'Compass está preparando una pista…', 'pt-BR': 'Compass está preparando uma dica…', vi: 'Compass đang chuẩn bị gợi ý…', id: 'Compass sedang menyiapkan petunjuk…', tr: 'Compass ipucu hazırlıyor…', pl: 'Compass przygotowuje wskazówkę…' })}
          onUnlock={() => { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'stats' } } as any); }}
        />);
    };
    return (<ScreenGradient artBackdrop={false}>
    <SafeAreaView testID="screen-streak-stats" style={{ flex: 1 }}>

      {/* Подтверждение траты осколков на заморозку */}
      <Modal transparent visible={freezeConfirmVisible} animationType="fade" onRequestClose={() => setFreezeConfirmVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFreezeConfirmVisible(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
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
              <TouchableOpacity activeOpacity={0.75} onPress={() => setFreezeConfirmVisible(false)} style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: statsHairline(themeMode, 'freeze'), paddingVertical: 13, alignItems: 'center' }}>
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
      <View style={{ paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 28 : 15, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TapScale
          onPress={() => {
            safeRouterBack(router, '/(tabs)/home' as any);
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TapScale>
        <Text
          style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginLeft: 8, flex: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {triLang(lang, {
            ru: 'Статистика',
            uk: 'Статистика',
            es: 'Estadísticas',
            'pt-BR': "Estatísticas",
            vi: "Thống kê",
            id: "Statistik",
            tr: "İstatistikler",
            pl: "Statystyki",
        })}
        </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity testID="stats-header-achievements" accessibilityHint={triLang(lang, {
            ru: ruAchievementRewardPhrase(achievementCount),
            uk: ukAchievementRewardPhrase(achievementCount),
            es: `${achievementCount} logro${achievementCount === 1 ? '' : 's'}`,
            'pt-BR': `${achievementCount} conquista${achievementCount === 1 ? '' : 's'}`,
            vi: `${achievementCount} thành tích`,
            id: `${achievementCount} pencapaian`,
            tr: `${achievementCount} başarı`,
            pl: plAchievementPhrase(achievementCount),
        })} activeOpacity={0.82} onPress={() => {
            hapticTap();
            router.push('/achievements_screen' as any);
        }} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: t.bgCard, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap') }}>
          <Ionicons name="trophy-outline" size={19} color={t.textSecond}/>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', flexShrink: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            {triLang(lang, {
            ru: ruAchievementRewardPhrase(achievementCount),
            uk: ukAchievementRewardPhrase(achievementCount),
            es: `${achievementCount} logro${achievementCount === 1 ? '' : 's'}`,
            'pt-BR': `${achievementCount} conquista${achievementCount === 1 ? '' : 's'}`,
            vi: `${achievementCount} thành tích`,
            id: `${achievementCount} pencapaian`,
            tr: `${achievementCount} başarı`,
            pl: plAchievementPhrase(achievementCount),
        })}
          </Text>
        </TouchableOpacity>
        {isCollectiblesEnabled() && collectiblesOwned > 0 && (
        <TouchableOpacity testID="stats-header-collectibles" accessibilityHint={triLang(lang, {
            ru: `Сокровищница: ${collectiblesOwned} из ${collectiblesTotalCount()}`,
            uk: `Скарбниця: ${collectiblesOwned} з ${collectiblesTotalCount()}`,
            es: `Colección: ${collectiblesOwned}/${collectiblesTotalCount()}`,
            'pt-BR': `Coleção: ${collectiblesOwned}/${collectiblesTotalCount()}`,
            vi: `Bộ sưu tập: ${collectiblesOwned}/${collectiblesTotalCount()}`,
            id: `Koleksi: ${collectiblesOwned}/${collectiblesTotalCount()}`,
            tr: `Koleksiyon: ${collectiblesOwned}/${collectiblesTotalCount()}`,
            pl: `Kolekcja: ${collectiblesOwned}/${collectiblesTotalCount()}`,
        })} activeOpacity={0.82} onPress={() => {
            hapticTap();
            router.push('/collectibles_screen' as any);
        }} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: t.bgCard, borderWidth: 1, borderColor: collectiblesUnseen > 0 ? statsBorder(themeMode, 'multipliers', 'strong') : (isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'multipliers')) }}>
          <Ionicons name="albums-outline" size={19} color={collectiblesUnseen > 0 ? t.textSecond : t.textMuted}/>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', flexShrink: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            {collectiblesOwned}/{collectiblesTotalCount()}
          </Text>
        </TouchableOpacity>
        )}
        <TouchableOpacity testID="stats-header-gifts" accessibilityHint={triLang(lang, {
            ru: ruGiftPhrase(pendingGiftCount),
            uk: ukGiftPhrase(pendingGiftCount),
            es: pendingGiftCount > 0 ? `${pendingGiftCount} regalo${pendingGiftCount === 1 ? '' : 's'}` : 'Regalos',
            'pt-BR': pendingGiftCount > 0 ? `${pendingGiftCount} presente${pendingGiftCount === 1 ? '' : 's'}` : 'Presentes',
            vi: pendingGiftCount > 0 ? `${pendingGiftCount} quà` : 'Quà',
            id: pendingGiftCount > 0 ? `${pendingGiftCount} hadiah` : 'Hadiah',
            tr: pendingGiftCount > 0 ? `${pendingGiftCount} hediye` : 'Hediyeler',
            pl: pendingGiftCount > 0 ? `${pendingGiftCount} ${pendingGiftCount === 1 ? 'prezent' : 'prezentów'}` : 'Prezenty',
        })} activeOpacity={0.82} onPress={() => {
            hapticTap();
            router.push('/level_gifts_inventory' as any);
        }} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: t.bgCard, borderWidth: 1, borderColor: pendingGiftCount > 0 ? statsBorder(themeMode, 'multipliers', 'strong') : (isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'multipliers')) }}>
          <Ionicons name="gift-outline" size={19} color={pendingGiftCount > 0 ? t.textSecond : t.textMuted}/>
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900', flexShrink: 1, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            {triLang(lang, {
            ru: ruGiftPhrase(pendingGiftCount),
            uk: ukGiftPhrase(pendingGiftCount),
            es: pendingGiftCount > 0 ? `${pendingGiftCount} regalo${pendingGiftCount === 1 ? '' : 's'}` : 'Regalos',
            'pt-BR': pendingGiftCount > 0 ? `${pendingGiftCount} presente${pendingGiftCount === 1 ? '' : 's'}` : 'Presentes',
            vi: pendingGiftCount > 0 ? `${pendingGiftCount} quà` : 'Quà',
            id: pendingGiftCount > 0 ? `${pendingGiftCount} hadiah` : 'Hadiah',
            tr: pendingGiftCount > 0 ? `${pendingGiftCount} hediye` : 'Hediyeler',
            pl: pendingGiftCount > 0 ? `${pendingGiftCount} ${pendingGiftCount === 1 ? 'prezent' : 'prezentów'}` : 'Prezenty',
        })}
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      <BouncyWrap>
      <ScrollView ref={scrollRef} decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" pointerEvents={statsReady ? 'auto' : 'none'} style={{ opacity: statsReady ? 1 : 0 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} onScroll={onBouncyScroll} scrollEventThrottle={16}>
        <View style={{ gap: 12 }}>
        <StreakStatsHero t={t} f={f} lang={lang} themeMode={themeMode} totalStreak={totalStreak} bestStreak={bestStreak} days={days} freezeActive={freezeActive} chainShieldDays={chainShieldDays} purpleColor={purpleColor} isGoldTheme={isGoldTheme} isPremium={isPremium} premiumFreezeUsed={premiumFreezeUsed} freezeShardCost={FREEZE_COST_SHARDS} shardsBalance={shardsBalance} onFreezePress={handleFreezeStreak} reviveOffer={reviveOffer} onRevivePress={handleReviveStreak} percentilesStreak={percentiles.streak}/>

        {/* XP MULTIPLIERS BLOCK */}
        {(() => {
            const streakM = totalStreak >= 30 ? 1.8 : totalStreak >= 14 ? 1.6 : totalStreak >= 7 ? 1.4 : totalStreak >= 3 ? 1.2 : 1;
            const clubWeekTierM = 1 + engineLeague.id * 0.1;
            const clubCombinedM = clubBoostMultiplier + clubWeekTierM + stationaryClubMultiplier - 2;
            const comebackM = comebackActive ? 2 : 1;
            const total = 1 + (streakM - 1) + (clubCombinedM - 1) + (leagueBoostMultiplier - 1) + (leagueGroupBoostMultiplier - 1) + (comebackM - 1) + (giftMultiplier - 1);
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
                <StatsCardArtSurface name="multipliers" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 1, borderColor: bonusAccent, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'multipliers') : null]}>
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
                      {activeItems.length > 0
                        ? triLang(lang, {
                            ru: `${activeItems.length} активных источника. Открой, если хочешь понять откуда берется множитель.`,
                            uk: `${activeItems.length} активних джерела. Відкрий, якщо хочеш зрозуміти звідки множник.`,
                            es: `${activeItems.length} fuentes activas. Abre para ver de dónde sale el multiplicador.`,
                            'pt-BR': `${activeItems.length} fontes ativas. Abra para ver de onde vem o multiplicador.`,
                            vi: `${activeItems.length} nguồn đang hoạt động. Mở để xem hệ số đến từ đâu.`,
                            id: `${activeItems.length} sumber aktif. Buka untuk melihat asal pengali.`,
                            tr: `${activeItems.length} aktif kaynak. Çarpanın nereden geldiğini görmek için aç.`,
                            pl: `${activeItems.length} aktywnych źródeł. Otwórz, aby zobaczyć, skąd bierze się mnożnik.`,
                        })
                        : triLang(lang, {
                            ru: 'Сейчас дополнительных бонусов нет. Это не влияет на план обучения.',
                            uk: 'Зараз додаткових бонусів немає. Це не впливає на план навчання.',
                            es: 'Ahora no hay bonos extra. No afecta tu plan de estudio.',
                            'pt-BR': "Agora não há bônus extras. Isso não afeta seu plano de estudo.",
                            vi: "Hiện không có thưởng thêm. Điều này không ảnh hưởng đến kế hoạch học.",
                            id: "Saat ini tidak ada bonus ekstra. Ini tidak memengaruhi rencana belajarmu.",
                            tr: "Şu anda ekstra bonus yok. Çalışma planını etkilemez.",
                            pl: "Teraz nie ma dodatkowych bonusów. Nie wpływa to na twój plan nauki.",
                        })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.45)"/>
                </StatsCardArtSurface>
              </TouchableOpacity>);
            }
            return (<StatsCardArtSurface name="multipliers" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} testID="stats-bonus-expanded" style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 1, borderColor: bonusAccent, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'multipliers') : null]}>
              <TouchableOpacity activeOpacity={0.84} onPress={() => {
                    hapticTap();
                    setBonusOpen(true);
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

        <StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="learningCoach" devUnlock={statsDevUnlock}>
          <LearningCoachCard t={t} f={f} lang={lang} metrics={coachMetrics} isGoldTheme={isGoldTheme} themeMode={themeMode} showAction={trainerPracticeDue >= STATS_TRAINER_ACTION_MIN_DUE} onAction={() => {
            hapticTap();
            router.push('/trainer' as any);
        }}/>
        </StatsPremiumBlur>
        {renderAiNote('balance', 'practiceBalance')}

        <StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="weekRhythm" devUnlock={statsDevUnlock}>
          <RhythmWeekCard t={t} f={f} lang={lang} metrics={coachMetrics} isGoldTheme={isGoldTheme} themeMode={themeMode}/>
        </StatsPremiumBlur>
        {renderAiNote('rhythm', 'weekRhythm')}

        {/* Годовая карта активности (~365 дней); премиум — без блюра. */}
        <StatsPremiumBlur isPremium={isPremium} context="heatmap" snapshotKey="heatmap" devUnlock={statsDevUnlock}>
        <View testID="stats-activity-365" onLayout={(event) => {
            activity365YRef.current = event.nativeEvent.layout.y;
        }}>
          <ActivityHeatmap365 hideNextStep={trainerPracticeDue >= STATS_TRAINER_ACTION_MIN_DUE}/>
        </View>
        </StatsPremiumBlur>
        {renderAiNote('year', 'activity')}

        {/* Перцентили — единый блок: горизонтальные дорожки «ты обходишь N%». */}
        {(() => {
            const pItems: {
                icon: keyof typeof Ionicons.glyphMap;
                color: string;
                label: string;
                percent: number;
            }[] = [];
            const visibleXpPercentile = visiblePercentile(percentiles.xp);
            const visibleWeekXpPercentile = visiblePercentile(percentiles.weekXp);
            const visibleDaily7XpPercentile = visiblePercentile(percentiles.daily7xp, myXp7 > 0);
            const visibleDaily7TimePercentile = visiblePercentile(percentiles.daily7timeMs, myTime7ms > 0);
            if (visibleXpPercentile !== null)
                pItems.push({ icon: 'trophy-outline', color: isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'multipliers'), percent: visibleXpPercentile, label: triLang(lang, {
                        ru: 'Суммарный опыт', uk: 'Сумарний досвід', es: 'XP total', 'pt-BR': 'XP total', vi: 'Tổng XP', id: 'Total XP', tr: 'Toplam XP', pl: 'Łączne XP',
                    }) });
            if (visibleWeekXpPercentile !== null)
                pItems.push({ icon: 'calendar-outline', color: isGoldTheme ? GOLD_RICH.metalGold : statsAccent(themeMode, 'archiveMap'), percent: visibleWeekXpPercentile, label: triLang(lang, {
                        ru: 'Опыт за неделю', uk: 'Досвід за тиждень', es: 'XP de la semana', 'pt-BR': 'XP da semana', vi: 'XP trong tuần', id: 'XP minggu ini', tr: 'Haftalık XP', pl: 'XP w tygodniu',
                    }) });
            if (visibleDaily7XpPercentile !== null)
                pItems.push({ icon: 'trending-up-outline', color: isGoldTheme ? GOLD_RICH.antiqueGold : statsAccent(themeMode, 'percentiles'), percent: visibleDaily7XpPercentile, label: triLang(lang, {
                        ru: 'Опыт за 7 дней', uk: 'Досвід за 7 днів', es: 'XP en 7 días', 'pt-BR': 'XP em 7 dias', vi: 'XP trong 7 ngày', id: 'XP 7 hari', tr: '7 günde XP', pl: 'XP w 7 dni',
                    }) });
            if (visibleDaily7TimePercentile !== null)
                pItems.push({ icon: 'time-outline', color: isGoldTheme ? GOLD_RICH.paleGold : statsAccent(themeMode, 'freeze'), percent: visibleDaily7TimePercentile, label: triLang(lang, {
                        ru: 'Время за 7 дней', uk: 'Час за 7 днів', es: 'Tiempo en 7 días', 'pt-BR': 'Tempo em 7 dias', vi: 'Thời gian 7 ngày', id: 'Waktu 7 hari', tr: '7 günde süre', pl: 'Czas w 7 dni',
                    }) });
            if (pItems.length === 0)
                return null;
            const percentilesAccent = isGoldTheme ? GOLD_RICH.champagne : statsAccent(themeMode, 'percentiles');
            return (<StatsPremiumBlur isPremium={isPremium} context="percentiles" snapshotKey="percentiles" devUnlock={statsDevUnlock}>
              <StatsCardArtSurface name="percentiles" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 16, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'percentiles', 'medium'), overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'percentiles') : null]}>
                <Text style={{ color: percentilesAccent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                  {triLang(lang, {
                    ru: 'Твой результат среди других',
                    uk: 'Ваш результат серед інших',
                    es: 'Tu resultado entre otros',
                    'pt-BR': "Seu resultado entre outros",
                    vi: "Kết quả của bạn so với người khác",
                    id: "Hasilmu dibanding yang lain",
                    tr: "Diğerleri arasındaki sonucun",
                    pl: "Twój wynik na tle innych",
                })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, lineHeight: f.label * 1.35, marginBottom: 14 }}>
                  {triLang(lang, {
                    ru: 'Доля пользователей, которых ты обходишь.',
                    uk: 'Частка користувачів, яких ти обходиш.',
                    es: 'Porcentaje de usuarios a los que superas.',
                    'pt-BR': "Porcentagem de usuários que você supera.",
                    vi: "Tỷ lệ người dùng bạn vượt qua.",
                    id: "Persentase pengguna yang kamu lampaui.",
                    tr: "Geçtiğin kullanıcıların yüzdesi.",
                    pl: "Odsetek użytkowników, których wyprzedzasz.",
                })}
                </Text>
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
            </StatsPremiumBlur>);
        })()}
        {renderAiNote('percentiles', 'percentiles')}

        {/* Два премиум-графика подряд; сразу под «Аналитика ошибок». */}
        <TouchableOpacity testID="stats-details-toggle" activeOpacity={0.84} onPress={() => {
            hapticTap();
            setDetailsOpen((v) => !v);
        }}>
          <StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} radius={statsSurfaceRadius(themeMode, 22)} style={[{ borderRadius: statsSurfaceRadius(themeMode, 22), padding: 14, borderWidth: 1, borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : statsBorder(themeMode, 'archiveMap', 'medium'), flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, !isGoldTheme ? statsGlowStyle(themeMode, 'archiveMap') : null]}>
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
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color="rgba(255,255,255,0.45)"/>
          </StatsCardArtSurface>
        </TouchableOpacity>

        {detailsOpen && (<View testID="stats-details-expanded" style={{ gap: 12 }}>
        {/* График по дням: переключатель «Опыт» / «Время» — для !premium закрыт blur\'ом + lock CTA. */}
        <StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="pathChart" devUnlock={statsDevUnlock}>
        {(() => {
                const chartDays = allDays.length > 0 ? allDays : days;
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
                return (<StatsCardArtSurface name="archiveMap" theme={t} isGoldTheme={isGoldTheme} gradientColors={statsCardGradient(t)} gradientLocations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} radius={16} style={{ borderRadius: 16, padding: 16, paddingBottom: 8, borderWidth: 0.5, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'archiveMap') }}>
              <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        borderRadius: 12,
                        padding: 3,
                        backgroundColor: segBg,
                        borderWidth: 0.5,
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
                            <Text style={{
                                    color: d.points > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                    fontSize: 7,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                              {ptsLabel}
                            </Text>
                          </View>
                          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                            <View style={{
                                    width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                                    backgroundColor: barColor,
                                    opacity: d.active ? 1 : 0.35,
                                }}/>
                          </View>
                          <Text style={{
                                    color: isToday ? t.textPrimary : t.textMuted,
                                    fontSize: 8, fontWeight: isToday ? '800' : '400',
                                    lineHeight: 11,
                                }} numberOfLines={1}>{d.shortLabel}</Text>
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
                            <Text style={{
                                    color: d.ms > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                    fontSize: 7,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                              {timeLabel}
                            </Text>
                          </View>
                          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                            <View style={{
                                    width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                                    backgroundColor: barColor,
                                    opacity: d.active ? 1 : 0.35,
                                }}/>
                          </View>
                          <Text style={{
                                    color: isToday ? t.textPrimary : t.textMuted,
                                    fontSize: 8, fontWeight: isToday ? '800' : '400',
                                    lineHeight: 11,
                                }} numberOfLines={1}>{d.shortLabel}</Text>
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
                }} f={f} lang={lang} data={lifetimeStats} expandedKind={expandedLifetimeKind} onToggleMetric={(kind) => {
                    if (!isPremium && !statsDevUnlock)
                        return;
                    setDevLifetimeAllCharts(false);
                    setLifetimePathChartsByKind({});
                    hapticTap();
                    setExpandedLifetimeKind((prev) => (prev === kind ? null : kind));
                }} chartDays={lifetimeChartDays} chartLoading={lifetimeChartLoading} chartScrollRef={lifetimeChartScrollRef} showAllPathCharts={devLifetimeAllCharts} pathChartsByKind={lifetimePathChartsByKind} isGoldTheme={isGoldTheme} themeMode={themeMode}/>
          </StatsPremiumBlur>)}
        {detailsOpen ? renderAiNote('lifetime', 'archiveMap') : null}
        {ENABLE_DEV_TOOLS && (<TouchableOpacity onPress={() => void randomizeLifetimeChartsForDev()} disabled={devLifetimeChartsBusy} activeOpacity={0.75} style={{
                    marginBottom: 12,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: 'rgba(255, 180, 60, 0.14)',
                    borderWidth: 1,
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



        {/* ── ПАРИ НА ЦЕПОЧКУ ───────────────────────────────────────────────── */}
        <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} isGoldTheme={isGoldTheme} themeMode={themeMode}/>

        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ReportErrorButton screen="streak_stats" dataId="streak_stats_main" dataText={triLang(lang, {
            ru: 'Цепочки и статистика',
            uk: 'Стріки та статистика',
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
      </ScrollView>
      </BouncyWrap>
      </Reanimated.View>
      </ContentWrap>

      {/* stationary_clubs feature удалён — модал описания клуба был мёртвым кодом
          (clubDescVisible никогда не выставлялся в true) и удалён. */}

      <ThemedConfirmModal visible={freezeNeedShardsModal} title={triLang(lang, {
            ru: 'Недостаточно осколков',
            uk: 'Недостатньо осколків',
            es: 'No tienes suficientes fragmentos',
            'pt-BR': "Você não tem fragmentos suficientes",
            vi: "Bạn không có đủ mảnh",
            id: "Fragmen kamu tidak cukup",
            tr: "Yeterli parçan yok",
            pl: "Nie masz wystarczająco odłamków",
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
    </ScreenGradient>);
}

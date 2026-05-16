import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Modal, Pressable,
  TouchableOpacity, Image, Platform, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import ReportErrorButton from '../components/ReportErrorButton';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import {
  streakCalendarShortWeekdays,
  streakWeekRowShort,
  streakWagerTierDaysLabel,
} from '../constants/streak_stats_i18n';
import { LEAGUES, CLUB_DESC_ES } from './league_engine';
import { loadWager, placeWager, wagerDaysLeft, WagerState, WAGER_TIERS } from './streak_wager';
// stationary_clubs feature удалён.
import { ENABLE_DEV_TOOLS, STORE_URL } from './config';
import { usePremium } from '../components/PremiumContext';
import StatsPremiumBlur from '../components/StatsPremiumBlur';
import ActivityHeatmap365 from '../components/ActivityHeatmap365';
import { hapticTap } from '../hooks/use-haptics';
import { getShardsBalance, spendShards } from './shards_system';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import {
  getStatsCache,
  hydrateStatsCacheFromStorage,
  refreshStatsCache,
  type StatsCachedDay,
  type StatsCachedTimeDay,
  type StatsPreloadData,
} from './statsCache';
import { onAppEvent } from './events';
import { oskolokImageForPackShards } from './oskolok';
import { loadActiveLeagueBoost } from './league_personal_boosts';
import { syncDailyAnalyticsIfNeeded, loadPercentileData } from './daily_analytics_sync';
import { type AllPercentiles } from './leaderboard_stats';
import { loadLifetimeProfileStats, readLifetimeProfileStatsCache, type LifetimeProfileStats } from './lifetime_profile_stats';
import {
  devRandomizeLifetimePathDailyMetrics,
  loadLifetimeTotalsChartDays,
  type LifetimeTotalsChartKind,
  type LifetimeChartDay,
  type DevLifetimePathRandomSums,
} from './stats_daily_breakdown';
import { loadAchievementStates } from './achievements';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { navigateAfterModalClose } from './safe_modal_navigation';

const CHART_H = 110;
const DAYS_SHOW = 14;

/** Градиент карточек статистики — берём из темы вместо хардкода зелёного */
function statsCardGradient(t: { bgCard: string; bgPrimary: string; cardGradient?: [string, string] }): [string, string, string] {
  const cg = (t as any).cardGradient as [string, string] | undefined;
  if (cg) return [cg[0], cg[0], cg[1]];
  return [t.bgCard, t.bgCard, t.bgPrimary];
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function ruAchievementRewardPhrase(total: number): string {
  return `${total} ${pluralRu(total, 'награда', 'награды', 'наград')}`;
}

function ukAchievementRewardPhrase(total: number): string {
  return `${total} ${pluralRu(total, 'нагорода', 'нагороди', 'нагород')}`;
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
  if (n === 0) return triLang(lang, { ru: '0', uk: '0', es: '0' });
  return String(n);
}

/** Время за день над столбцом «Время в приложении» (foreground, мс). */
function formatTimeBarMs(ms: number, lang: Lang): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalM = Math.floor(safe / 60000);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  if (safe > 0 && totalM < 1) {
    return triLang(lang, { ru: '<1м', uk: '<1хв', es: '<1m' });
  }
  if (totalM <= 0) return triLang(lang, { ru: '0', uk: '0', es: '0' });
  if (h === 0) return triLang(lang, { ru: `${m}м`, uk: `${m}хв`, es: `${m}m` });
  if (m === 0) return triLang(lang, { ru: `${h}ч`, uk: `${h}г`, es: `${h}h` });
  return triLang(lang, { ru: `${h}ч${m}`, uk: `${h}г${m}`, es: `${h}h${m}` });
}

type LearningRhythmDay = DayData & {
  minutes: number;
  combined: number;
  isToday: boolean;
};

type LearningCoachMetrics = {
  score: number;
  status: string;
  scoreHint: string;
  active7: number;
  xp7: number;
  minutes7: number;
  avgMinutesActive: number;
  totalStreak: number;
  todayXp: number;
  todayMinutes: number;
  bestDayLabel: string;
  weakDayLabel: string;
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
  if (safe === 0) return triLang(lang, { ru: '0 мин', uk: '0 хв', es: '0 min' });
  if (safe < 60) return triLang(lang, { ru: `${safe} мин`, uk: `${safe} хв`, es: `${safe} min` });
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (m === 0) return triLang(lang, { ru: `${h} ч`, uk: `${h} год`, es: `${h} h` });
  return triLang(lang, { ru: `${h} ч ${m} мин`, uk: `${h} год ${m} хв`, es: `${h} h ${m} min` });
}

function buildLearningCoachMetrics(
  dayRows: DayData[],
  timeRows: TimeDayData[],
  totalStreak: number,
  lang: Lang,
): LearningCoachMetrics {
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
  const scoreColor = score >= 76 ? '#35D07F' : score >= 50 ? '#FFB020' : '#FF6B6B';
  const status = score >= 76
    ? triLang(lang, { ru: 'Стабильный ритм', uk: 'Стабільний ритм', es: 'Ritmo estable' })
    : score >= 50
      ? triLang(lang, { ru: 'Нужно чуть ровнее', uk: 'Потрібно трохи рівніше', es: 'Hace falta más ritmo' })
      : triLang(lang, { ru: 'Ритм просел', uk: 'Ритм просів', es: 'El ritmo bajó' });
  const scoreHint = triLang(lang, {
    ru: 'Показывает, насколько ровно идет практика за последние 7 дней. Лучше всего помогают короткие занятия без больших пауз.',
    uk: 'Показує, наскільки рівно йде практика за останні 7 днів. Найкраще допомагають короткі заняття без великих пауз.',
    es: 'Muestra qué tan estable fue la práctica en los últimos 7 días. Ayudan más las sesiones cortas sin pausas largas.',
  });
  let actionTitle = triLang(lang, { ru: 'Сделай 5 минут сегодня', uk: 'Зроби 5 хвилин сьогодні', es: 'Haz 5 minutos hoy' });
  let actionBody = triLang(lang, {
    ru: 'Лучший ход сейчас: короткое повторение, чтобы день засчитался и ритм не провалился.',
    uk: 'Найкращий хід зараз: коротке повторення, щоб день зарахувався і ритм не просів.',
    es: 'El mejor paso ahora: una repetición corta para contar el día y sostener el ritmo.',
  });
  let actionCta = triLang(lang, { ru: 'Начать 5 минут', uk: 'Почати 5 хвилин', es: 'Empezar 5 min' });
  if (todayXp > 0 || todayMinutes > 0) {
    actionTitle = triLang(lang, { ru: 'Закрепи день тренировкой', uk: 'Закріпи день тренуванням', es: 'Cierra el día con práctica' });
    actionBody = triLang(lang, {
      ru: 'Добавь одну короткую тренировку, чтобы усилить сегодняшний результат.',
      uk: 'Додай одне коротке тренування, щоб посилити сьогоднішній результат.',
      es: 'Suma una práctica corta para reforzar el resultado de hoy.',
    });
    actionCta = triLang(lang, { ru: 'Открыть тренажер', uk: 'Відкрити тренажер', es: 'Abrir práctica' });
  } else if (active7 >= 5) {
    actionTitle = triLang(lang, { ru: 'Не ломай хороший темп', uk: 'Не ламай хороший темп', es: 'No rompas el buen ritmo' });
    actionBody = triLang(lang, {
      ru: 'Неделя сильная. Достаточно маленькой сессии, чтобы сохранить стабильность.',
      uk: 'Тиждень сильний. Достатньо маленької сесії, щоб зберегти стабільність.',
      es: 'La semana va bien. Una sesión pequeña basta para mantener la estabilidad.',
    });
  }

  return {
    score,
    status,
    scoreHint,
    active7,
    xp7,
    minutes7,
    avgMinutesActive,
    totalStreak,
    todayXp,
    todayMinutes,
    bestDayLabel: bestDay?.shortLabel ?? '-',
    weakDayLabel: weakDay?.shortLabel ?? '-',
    actionTitle,
    actionBody,
    actionCta,
    scoreColor,
    rhythmDays,
  };
}

function rollingAvg3Series(vals: number[]): number[] {
  const n = vals.length;
  if (n === 0) return [];
  return vals.map((_, i) => {
    const i0 = Math.max(0, i - 1);
    const i1 = i;
    const i2 = Math.min(n - 1, i + 1);
    return Math.round((vals[i0] + vals[i1] + vals[i2]) / 3);
  });
}

function lifetimeLineChartContentWidth(n: number): number {
  if (n <= 0) return 1;
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
  if (n === 0 || maxV <= 0) return '';
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

function LifetimePathLineChart({
  days,
  loading,
  scrollRef,
  chartTheme,
  plotFutureDays = false,
  showSmoothedLine = true,
}: {
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

  const smooth =
    hasDailyData && showSmoothedLine && !hasFutureValues ? rollingAvg3Series(raw) : [];
  const maxV = hasDailyData
    ? Math.max(1, ...raw, ...(smooth.length > 0 ? smooth : []))
    : 1;
  const chartW = lifetimeLineChartContentWidth(visibleDays.length);
  const chartLen = raw.length;
  /** Одна колонка: polyline из одной пары координат почти не видна — рисуем точку явно. */
  const drawLines = hasDailyData && chartLen >= 2;
  const pointsRed = drawLines ? buildLifetimeLinePoints(raw, maxV, LIFETIME_LINE_PLOT_H) : '';
  const pointsPink =
    drawLines && showSmoothedLine && smooth.length > 0
      ? buildLifetimeLinePoints(smooth, maxV, LIFETIME_LINE_PLOT_H)
      : '';
  const yZero = lifetimeLineChartZeroLevelY(LIFETIME_LINE_PLOT_H);
  /** Пока нет данных за неделю — маркер на первый день недели слева, не «вперёди» справа. */
  const startDotCx = LIFETIME_LINE_COL_W / 2;

  return (
    <View
      style={{
        marginTop: 8,
        marginBottom: 4,
        paddingTop: 4,
      }}
    >
      <ScrollView
        ref={scrollRef ?? undefined}
        horizontal
        showsHorizontalScrollIndicator
        onLayout={() => scrollRef?.current?.scrollTo?.({ x: 0, y: 0, animated: false })}
      >
        <View>
          <Svg width={chartW} height={LIFETIME_LINE_PLOT_H}>
            {[0, 1, 2, 3, 4].map((g) => {
              const plotBottom = LIFETIME_LINE_PLOT_H - 4;
              const plotTop = 8;
              const y = plotTop + ((plotBottom - plotTop) * g) / 4;
              return (
                <Line
                  key={`g-${g}`}
                  x1={0}
                  y1={y}
                  x2={chartW}
                  y2={y}
                  stroke={ct.border}
                  strokeWidth={1}
                />
              );
            })}
            {!hasDailyData ? (
              <Circle cx={startDotCx} cy={yZero} r={4.5} fill={ct.accent} />
            ) : chartLen === 1 && raw[0] > 0 ? (
              <Circle
                cx={LIFETIME_LINE_COL_W / 2}
                cy={lifetimeChartYForValue(raw[0], maxV, LIFETIME_LINE_PLOT_H)}
                r={5}
                fill={ct.accent}
              />
            ) : (
              <>
                {pointsPink.length > 0 ? (
                  <Polyline
                    points={pointsPink}
                    fill="none"
                    stroke={ct.accent}
                    strokeOpacity={0.38}
                    strokeWidth={2.25}
                  />
                ) : null}
                {pointsRed.length > 0 ? (
                  <Polyline points={pointsRed} fill="none" stroke={ct.accent} strokeWidth={2.75} />
                ) : null}
              </>
            )}
          </Svg>
          <View style={{ flexDirection: 'row', gap: LIFETIME_LINE_GAP, marginTop: 8 }}>
            {visibleDays.map((d, i) => {
              const isToday = d.date === chartToday;
              const isFuture = d.date > chartToday;
              return (
                <View key={`ltx-${i}`} style={{ width: LIFETIME_LINE_COL_W, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: isToday ? '800' : '500',
                      color: isToday ? ct.accent : ct.textMuted,
                      opacity: isFuture ? 0.45 : 1,
                    }}
                    numberOfLines={1}
                  >
                    {d.shortLabel}
                  </Text>
                  <Text
                    style={{
                      fontSize: 8,
                      marginTop: 2,
                      fontWeight: isToday ? '800' : '400',
                      color: isToday ? ct.textSecond : ct.textMuted,
                      opacity: isFuture ? 0.45 : 1,
                    }}
                  >
                    {d.dayNum}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function LifetimeTotalsBlock({
  t,
  f,
  lang,
  data,
  expandedKind,
  onToggleMetric,
  chartDays,
  chartLoading,
  chartScrollRef,
  gateExpandAll,
  teaserChartDays,
  showAllPathCharts,
  pathChartsByKind,
}: {
  t: {
    bgCard: string;
    bgSurface: string;
    border: string;
    textPrimary: string;
    textSecond: string;
    textMuted: string;
    accent: string;
  };
  f: { label: number; body: number; h2: number; sub: number };
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
}) {

  const metricRow = (label: string, value: string, kind: LifetimeTotalsChartKind) => {
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
    return (
      <React.Fragment key={kind}>
        <TouchableOpacity
          activeOpacity={0.72}
          onPress={() => onToggleMetric(kind)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 7,
              borderBottomWidth: 0.5,
              borderBottomColor: t.border,
              gap: 8,
            }}
          >
            <Text style={{ color: t.accent, fontSize: f.body, flex: 1, fontWeight: '600' }} numberOfLines={2}>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>
                {value}
              </Text>
              <Ionicons
                name={rowExpanded ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={t.textMuted}
              />
            </View>
          </View>
        </TouchableOpacity>
        {showChart ? (
          <>
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.sub,
                marginTop: 8,
                marginBottom: 2,
              }}
            >
              {triLang(lang, {
                ru: 'По дням: текущая и следующая календарные недели',
                uk: 'За днями: поточний і наступний календарні тижні',
                es: 'Por días: semana actual y próxima',
              })}
            </Text>
            <LifetimePathLineChart
              days={daysForChart}
              loading={loadingForChart}
              scrollRef={teaserOk || (showAllPathCharts && !!multiSeries?.length) ? undefined : chartScrollRef}
              plotFutureDays={!!showAllPathCharts}
              showSmoothedLine={!showAllPathCharts}
              chartTheme={{
                bgSurface: t.bgSurface,
                border: t.border,
                textPrimary: t.textPrimary,
                textSecond: t.textSecond,
                textMuted: t.textMuted,
                accent: t.accent,
              }}
            />
          </>
        ) : null}
      </React.Fragment>
    );
  };

  return (
    <View
      style={{
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        backgroundColor: t.bgCard,
        borderWidth: 0.5,
        borderColor: t.border,
      }}
    >
      <Text
        style={{
          color: t.textMuted,
          fontSize: f.label,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 10,
        }}
      >
        {triLang(lang, { ru: 'За всё время', uk: 'За весь час', es: 'Total histórico' })}
      </Text>
      <Text
        style={{
          color: t.textMuted,
          fontSize: f.sub,
          marginTop: -4,
          marginBottom: 8,
          lineHeight: f.sub * 1.35,
        }}
      >
        {triLang(lang, {
          ru: 'Числа справа — общий итог за всё время.',
          uk: 'Числа праворуч — загальний підсумок за весь час.',
          es: 'Los números de la derecha son el total histórico.',
        })}
      </Text>
      {metricRow(
        triLang(lang, { ru: 'Слов выучено', uk: 'Слів вивчено', es: 'Palabras aprendidas' }),
        String(data.wordsLearned),
        'words_learned',
      )}
      {metricRow(
        triLang(lang, { ru: 'Карточек сохранено', uk: 'Карток збережено', es: 'Tarjetas guardadas' }),
        String(data.flashcardsSaved),
        'flashcards_saved',
      )}
      {metricRow(
        triLang(lang, {
          ru: 'Фраз выучено',
          uk: 'Фраз вивчено',
          es: 'Frases aprendidas',
        }),
        String(data.phrasesLearned),
        'phrases_learned',
      )}
      {metricRow(
        triLang(lang, {
          ru: 'Квизов пройдено',
          uk: 'Квізів пройдено',
          es: 'Cuestionarios hechos',
        }),
        String(data.quizzesTotal),
        'quizzes_completed',
      )}
      {metricRow(
        triLang(lang, { ru: 'Побед на Арене', uk: 'Перемог на Арені', es: 'Victorias en Arena' }),
        String(data.arenaWins),
        'arena_wins',
      )}
      {metricRow(
        triLang(lang, { ru: 'Поражений на Арене', uk: 'Поразок на Арені', es: 'Derrotas en Arena' }),
        String(data.arenaLosses),
        'arena_losses',
      )}
      {metricRow(
        triLang(lang, {
          ru: 'Заданий дня выполнено',
          uk: 'Завдань дня виконано',
          es: 'Misiones diarias hechas',
        }),
        String(data.dailyTasksClaimed),
        'daily_tasks_claimed',
      )}
      {metricRow(
        triLang(lang, { ru: 'Осколков заработано', uk: 'Осколків зароблено', es: 'Fragmentos ganados' }),
        String(data.shardsEarned),
        'shards_earned',
      )}
      {metricRow(
        triLang(lang, { ru: 'Осколков потрачено', uk: 'Осколків витрачено', es: 'Fragmentos gastados' }),
        String(data.shardsSpent),
        'shards_spent',
      )}
    </View>
  );
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

function mergeDevRandomSumsIntoLifetime(
  base: LifetimeProfileStats,
  sums: DevLifetimePathRandomSums,
): LifetimeProfileStats {
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
function ShardsInline({ n, size = 14, textColor }: { n: number | string; size?: number; textColor?: string }) {
  const nNum = typeof n === 'number' ? n : parseInt(String(n), 10);
  const src = oskolokImageForPackShards(
    Number.isFinite(nNum) && nNum > 0 ? nNum : 0,
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: textColor ?? '#E9D5FF', fontSize: size, fontWeight: '700', lineHeight: size * 1.35 }}>{n}</Text>
      <Image
        source={src}
        style={{ width: size + 2, height: size + 2 }}
        resizeMode="contain"
      />
    </View>
  );
}

function WagerCard({ lang, t, f, totalStreak }: { lang: Lang; t: any; f: any; totalStreak: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [wager, setWager]               = useState<WagerState | null>(null);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [placing, setPlacing]           = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [shardsWager, setShardsWager]   = useState(0);
  const [wagerNeedShards, setWagerNeedShards] = useState(false);
  const [wagerConfirm, setWagerConfirm] = useState(false);
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);

  const reload = async () => {
    const [w, shardsRaw] = await Promise.all([
      loadWager(),
      getShardsBalance(),
    ]);
    setWager(w);
    setShardsWager(shardsRaw);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const clampTierIdx = (i: number) => Math.max(0, Math.min(i, WAGER_TIERS.length - 1));

  const handlePlace = () => {
    const tier = WAGER_TIERS[clampTierIdx(selectedTier)];
    if (!tier) return;
    if (shardsWager < tier.betShards) {
      setWagerNeedShards(true);
      return;
    }
    setWagerConfirm(true);
  };

  const doPlace = async () => {
    setPlacing(true);
    const ok = await placeWager(totalStreak, clampTierIdx(selectedTier));
    if (ok) {
      await reload();
      setModalOpen(false);
    }
    setPlacing(false);
  };

  if (loading) return null;

  // ── Результат ──────────────────────────────────────────────────────────────
  if (wager && !wager.active && wager.result !== 'pending') {
    const won = wager.result === 'won';
    const resultColor = won ? '#34C759' : '#FF3B30';
    return (
      <View testID="wager-result-card" style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: resultColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={won ? 'trophy' : 'close-circle'} size={22} color={resultColor} />
        </View>
        <View style={{ flex: 1 }}>
          {won ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Пари выиграно!',
                  uk: 'Парі виграно!',
                  es: '¡Apuesta ganada!',
                })}
              </Text>
              <ShardsInline n={`+${wager.rewardShards}`} size={f.body} textColor={resultColor} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: `+${wager.rewardXP} к опыту`,
                  uk: `+${wager.rewardXP} до досвіду`,
                  es: `+${wager.rewardXP} de XP`,
                })}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Цепочка сорвана · −',
                  uk: 'Ланцюжок зірвано · −',
                  es: 'Racha perdida · −',
                })}
              </Text>
              <ShardsInline n={wager.betShards} size={f.body} textColor={resultColor} />
            </View>
          )}
          <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
            {triLang(lang, {
              ru: 'Принять новое пари?',
              uk: 'Прийняти нове парі?',
              es: '¿Empezar otra apuesta?',
            })}
          </Text>
        </View>
        <TouchableOpacity
          testID="wager-result-new"
          onPress={() => setWager(null)}
          style={{ backgroundColor: t.bgSurface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Да', uk: 'Так', es: 'Sí' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Активное пари ──────────────────────────────────────────────────────────
  if (wager?.active) {
    const daysLeft = wagerDaysLeft(wager);
    const daysKept = wager.daysRequired - daysLeft;
    const tierIcon = TIER_ICONS_WAGER[wager.tierIdx] ?? 'flame-outline';
    const progressPct = Math.max(0, Math.min(100, Math.round((daysKept / wager.daysRequired) * 100)));
    const netShards = Math.max(0, wager.rewardShards - wager.betShards);
    const motivation = triLang(lang, {
      ru: daysLeft <= 1 ? 'Финиш рядом. Один спокойный день - и банк твой.' : 'Держи темп: каждый день приближает приз.',
      uk: daysLeft <= 1 ? 'Фініш поруч. Один спокійний день - і банк твій.' : 'Тримай темп: кожен день наближає приз.',
      es: daysLeft <= 1 ? 'La meta esta cerca. Un dia mas y el bote es tuyo.' : 'Mantente firme: cada dia acerca el premio.',
    });

    return (
      <View testID="wager-active-card" style={{ backgroundColor: t.bgCard, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.textSecond + '24', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.textSecond + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tierIcon} size={20} color={t.textSecond} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Пари активно', uk: 'Парі активне', es: 'Apuesta activa' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 18, marginTop: 2 }} numberOfLines={2}>
              {motivation}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', flexShrink: 1 }}>
                {triLang(lang, {
                  ru: `${daysLeft} дн. осталось · ставка`,
                  uk: `${daysLeft} дн. залишилось · ставка`,
                  es: `Quedan ${daysLeft} días · apuesta`,
                })}
              </Text>
              <ShardsInline n={wager.betShards} size={f.label} textColor={t.textSecond} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: 104 }}>
            <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
              {triLang(lang, { ru: 'Приз', uk: 'Приз', es: 'Premio' })}
            </Text>
            <ShardsInline n={wager.rewardShards} size={f.body} textColor={t.textSecond} />
            <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 3 }}>
              {triLang(lang, {
                ru: `ещё +${wager.rewardXP} опыта`,
                uk: `ще +${wager.rewardXP} досвіду`,
                es: `+${wager.rewardXP} XP extra`,
              })}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
              {triLang(lang, { ru: 'Прогресс пари', uk: 'Прогрес парі', es: 'Progreso' })}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '900' }}>
              {progressPct}%
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: t.bgSurface2, overflow: 'hidden' }}>
            <LinearGradient
              colors={[t.textSecond, '#34C759']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? 10 : 0, height: '100%', borderRadius: 999 }}
            />
          </View>
        </View>

        {/* Day dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: wager.daysRequired }, (_, i) => {
            const done = i < daysKept;
            const cur  = i === daysKept;
            return (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3,
                backgroundColor: done ? t.textSecond : cur ? t.textSecond + '55' : t.bgSurface2 }} />
            );
          })}
        </View>
        <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center' }}>
          {triLang(lang, {
            ru: `${daysKept} из ${wager.daysRequired} дней сохранено`,
            uk: `${daysKept} з ${wager.daysRequired} днів збережено`,
            es: `${daysKept} de ${wager.daysRequired} días guardados`,
          })}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, minWidth: 0, backgroundColor: t.bgSurface2, borderRadius: 12, padding: 10 }}>
            <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>
              {triLang(lang, { ru: 'ЧИСТЫЙ ПЛЮС', uk: 'ЧИСТИЙ ПЛЮС', es: 'NETO' })}
            </Text>
            <ShardsInline n={`+${netShards}`} size={f.body} textColor={t.textSecond} />
          </View>
          <View style={{ flex: 1, minWidth: 0, backgroundColor: t.bgSurface2, borderRadius: 12, padding: 10 }}>
            <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4 }}>
              {triLang(lang, { ru: 'ОПЫТ', uk: 'ДОСВІД', es: 'XP' })}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>+{wager.rewardXP}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            hapticTap();
            setWagerInfoOpen(v => !v);
          }}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.textSecond + '12' }}
        >
          <Ionicons name="information-circle-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }}>
            {triLang(lang, { ru: wagerInfoOpen ? 'Скрыть правила пари' : 'Открыть правила и награды', uk: wagerInfoOpen ? 'Сховати правила парі' : 'Відкрити правила й нагороди', es: wagerInfoOpen ? 'Ocultar reglas' : 'Ver reglas y premios' })}
          </Text>
          <Ionicons name={wagerInfoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textGhost} />
        </TouchableOpacity>
        {wagerInfoOpen ? (
          <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 10 }}>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 18 }}>
              {triLang(lang, {
                ru: 'Заходи и удерживай цепочку каждый день до конца срока. Если серия не сорвется, ставка вернется вместе с призом и опытом.',
                uk: 'Заходь і тримай ланцюжок щодня до кінця строку. Якщо серія не зірветься, ставка повернеться разом із призом і досвідом.',
                es: 'Entra y conserva la racha cada dia hasta el final. Si no se rompe, recuperas la apuesta con premio y XP.',
              })}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Кнопка → открывает модал ────────────────────────────────────────────────
  const sel       = WAGER_TIERS[clampTierIdx(selectedTier)];
  const canAfford = shardsWager >= sel.betShards;

  return (
    <>
      <TouchableOpacity
        testID="wager-open"
        onPress={() => setModalOpen(true)}
        activeOpacity={0.86}
      >
        <LinearGradient
          colors={statsCardGradient(t)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: `${t.accent}59`, flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden' }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${t.accent}26`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="dice-outline" size={22} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Пари', uk: 'Парі', es: 'Apuesta' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 18, marginTop: 2 }} numberOfLines={2}>
              {triLang(lang, {
                ru: 'Вклад осколками — удержи серию и забери награду',
                uk: 'Внесок осколками — утримай серію й забери нагороду',
                es: 'Aporta fragmentos: mantén la racha y cobra la recompensa',
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textGhost} style={{ marginTop: 13 }} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Модал выбора ставки */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }} onPress={() => setModalOpen(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View testID="wager-modal" style={{ backgroundColor: t.bgPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: `${t.accent}59`, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0, maxHeight: '92%', overflow: 'hidden' }}>

              {/* Handle */}
              <View style={{ width: 36, height: 4, backgroundColor: t.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
              >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Пари на цепочку',
                    uk: 'Парі на ланцюжок',
                    es: 'Apuesta por la racha',
                  })}
                </Text>
                {/* Shard balance chip */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.bgSurface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: t.border }}>
                  <Image
                    source={oskolokImageForPackShards(typeof shardsWager === 'number' ? shardsWager : 0)}
                    style={{ width: 16, height: 16 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{shardsWager}</Text>
                </View>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 14, lineHeight: 20 }}>
                {triLang(lang, {
                  ru: 'Выбери срок и внеси ставку осколками. Удержишь цепочку — получишь прибыль осколками и опыт.',
                  uk: 'Обери строк і внеси ставку осколками. Утримаєш ланцюжок — отримаєш прибуток осколками та досвід.',
                  es: 'Elige un plazo y aporta fragmentos. Si mantienes la racha, ganas fragmentos netos y XP.',
                })}
              </Text>

              {/* Твой вызов */}
              <View style={{ borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: `${t.accent}2E`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={TIER_ICONS_WAGER[clampTierIdx(selectedTier)]} size={17} color={t.accent} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>
                    {triLang(lang, { ru: 'Твой вызов', uk: 'Твій виклик', es: 'Tu reto' })}
                  </Text>
                  <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '900' }}>+{sel.rewardXP} XP</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                    <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {triLang(lang, { ru: 'Вносишь', uk: 'Вносиш', es: 'Aportas' })}
                    </Text>
                    <ShardsInline n={sel.betShards} size={f.body} textColor={t.textPrimary} />
                  </View>
                  <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                    <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {triLang(lang, { ru: 'Получишь', uk: 'Отримаєш', es: 'Ganas' })}
                    </Text>
                    <ShardsInline n={`+${sel.rewardShards - sel.betShards}`} size={f.body} textColor={t.accent} />
                  </View>
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.label, lineHeight: 16 }}>
                  {triLang(lang, {
                    ru: 'Чем длиннее срок, тем выше награда. Выбирай вызов, который действительно сможешь удержать.',
                    uk: 'Що довший строк, то вища нагорода. Обирай виклик, який справді зможеш утримати.',
                    es: 'Cuanto más largo el reto, mayor la recompensa. Elige uno que puedas sostener de verdad.',
                  })}
                </Text>
              </View>

              <View style={{ gap: 8, marginBottom: 18 }}>
                {[[0, 1], [2, 3], [4, 5]].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map(i => {
                      const tier      = WAGER_TIERS[i];
                      const netShards = tier.rewardShards - tier.betShards;
                      const icon      = TIER_ICONS_WAGER[i];
                      const label     = streakWagerTierDaysLabel(lang, i);
                      const selected  = selectedTier === i;
                      const afford    = shardsWager >= tier.betShards;
                      const deficit   = Math.max(0, tier.betShards - shardsWager);
                      return (
                        <TouchableOpacity
                          testID={`wager-tier-${i}`}
                          key={i}
                          onPress={() => setSelectedTier(i)}
                          activeOpacity={0.75}
                          style={{
                            flex: 1, borderRadius: 16,
                            backgroundColor: selected ? `${t.accent}1F` : `${t.border}`,
                            borderWidth: selected ? 1.5 : 1,
                            borderColor: selected ? `${t.accent}99` : t.border,
                            opacity: afford ? 1 : 0.45,
                            paddingVertical: 10, paddingHorizontal: 10,
                            gap: 4, minHeight: 72,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={icon} size={16} color={selected ? t.accent : t.textMuted} />
                            <Text
                              style={{ color: selected ? t.textPrimary : t.textMuted, fontSize: f.sub, fontWeight: '800', flex: 1 }}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </View>
                          {afford ? (
                            <>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '600' }}>
                                  {triLang(lang, { ru: 'Вклад', uk: 'Внесок', es: 'Aporte' })}
                                </Text>
                                <ShardsInline n={tier.betShards} size={10} textColor={t.textGhost} />
                              </View>
                              <Text style={{ color: selected ? t.accent : t.textPrimary, fontSize: 13, fontWeight: '800' }}>
                                {`+${netShards} ${triLang(lang, { ru: 'чистыми', uk: 'чистими', es: 'netos' })}`}
                              </Text>
                            </>
                          ) : (
                            <Text style={{ color: t.textGhost, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {triLang(lang, {
                                ru: `Нужно ещё ${deficit} оск.`,
                                uk: `Ще ${deficit} оск.`,
                                es: `Faltan ${deficit} frag.`,
                              })}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                testID="wager-place"
                onPress={handlePlace}
                disabled={placing || !canAfford}
                activeOpacity={0.85}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={canAfford ? [t.accent, t.accent] : [t.bgSurface, t.bgSurface]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, borderWidth: canAfford ? 0 : 1, borderColor: t.border }}
                >
                  {placing ? (
                    <Text style={{ color: canAfford ? t.correctText : t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, { ru: 'Подтверждаем...', uk: 'Підтверджуємо...', es: 'Confirmando…' })}
                    </Text>
                  ) : canAfford ? (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color={t.correctText} />
                        <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>
                          {triLang(lang, { ru: 'Внести ', uk: 'Внести ', es: 'Aportar ' })}
                        </Text>
                        <ShardsInline n={sel.betShards} size={f.body} textColor={t.correctText} />
                      </View>
                      <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700', textAlign: 'center', opacity: 0.75 }}>
                        {triLang(lang, {
                          ru: `Награда: +${sel.rewardShards - sel.betShards} оск. чистыми · +${sel.rewardXP} опыта`,
                          uk: `Нагорода: +${sel.rewardShards - sel.betShards} оск. чистими · +${sel.rewardXP} досвіду`,
                          es: `Recompensa: +${sel.rewardShards - sel.betShards} frag. netos · +${sel.rewardXP} XP`,
                        })}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="lock-closed-outline" size={18} color={t.textGhost} />
                      <Text style={{ color: t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Недостаточно осколков',
                          uk: 'Недостатньо осколків',
                          es: 'No tienes suficientes fragmentos',
                        })}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              </ScrollView>

            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ThemedConfirmModal
        visible={wagerNeedShards}
        title={triLang(lang, {
          ru: 'Недостаточно осколков',
          uk: 'Недостатньо осколків',
          es: 'No tienes suficientes fragmentos',
        })}
        messageNode={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 22 }}>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, { ru: 'Нужно:', uk: 'Потрібно:', es: 'Hacen falta:' })}
            </Text>
            <ShardsInline n={sel.betShards} size={f.body} textColor="#A78BFA" />
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, { ru: 'осколков', uk: 'осколків', es: 'fragmentos' })}
            </Text>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'В магазин', uk: 'У магазин', es: 'A la tienda' })}
        testIDPrefix="wager-need-shards"
        onCancel={() => setWagerNeedShards(false)}
        onConfirm={() => {
          navigateAfterModalClose(
            () => setWagerNeedShards(false),
            () => router.push({
              pathname: '/shards_shop',
              params: {
                need: String(Math.max(0, sel.betShards - shardsWager)),
                source: 'streak_wager',
              },
            } as any),
          );
        }}
      />
      <ThemedConfirmModal
        visible={wagerConfirm}
        title={triLang(lang, {
          ru: 'Подтвердить пари',
          uk: 'Підтвердити парі',
          es: 'Confirmar la apuesta',
        })}
        messageNode={
          <View style={{ gap: 10, marginBottom: 22 }}>
            {/* Stake row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, { ru: 'Вклад:', uk: 'Внесок:', es: 'Aporte:' })}
              </Text>
              <ShardsInline n={sel.betShards} size={f.body} textColor={t.textPrimary} />
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
                  })}
                </Text>
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <Text style={{ color: t.textMuted, fontSize: f.body }}>
                      {triLang(lang, { ru: 'К балансу', uk: 'До балансу', es: 'Al saldo' })}
                    </Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      +{sel.rewardShards - sel.betShards}
                    </Text>
                    <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                      {triLang(lang, {
                        ru: `(начислим +${sel.rewardShards}; твой вклад уже учтен)`,
                        uk: `(зарахуємо +${sel.rewardShards}; твій внесок уже враховано)`,
                        es: `(abonamos +${sel.rewardShards}; tu aporte ya está contado)`,
                      })}
                    </Text>
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.body }}>
                    {triLang(lang, {
                      ru: `+${sel.rewardXP} к опыту`,
                      uk: `+${sel.rewardXP} до досвіду`,
                      es: `+${sel.rewardXP} de XP`,
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
                })}
              </Text>
              <ShardsInline n={sel.betShards} size={f.body} textColor="#FF3B30" />
            </View>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'Внести', uk: 'Внести', es: 'Aportar' })}
        testIDPrefix="wager-confirm"
        onCancel={() => setWagerConfirm(false)}
        onConfirm={() => {
          setWagerConfirm(false);
          void doPlace();
        }}
      />
    </>
  );
}

/** Цепочка дней, неделя, заморозка, перцентиль цепочки — вынесено для порядка блоков на экране. */
function StreakStatsHero({
  t,
  f,
  lang,
  totalStreak,
  bestStreak,
  days,
  freezeActive,
  chainShieldDays,
  purpleColor,
  isPremium,
  premiumFreezeUsed,
  freezeShardCost,
  shardsBalance,
  onFreezePress,
  percentilesStreak,
}: {
  t: any;
  f: any;
  lang: Lang;
  totalStreak: number;
  bestStreak: number;
  days: DayData[];
  freezeActive: boolean;
  chainShieldDays: number;
  purpleColor: string;
  isPremium: boolean;
  premiumFreezeUsed: boolean;
  freezeShardCost: number;
  shardsBalance: number;
  onFreezePress: () => void;
  percentilesStreak: number | null;
}) {
  return (
    <LinearGradient colors={statsCardGradient(t)} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={{ borderRadius: 22, padding: 16, borderWidth: 1, borderColor: freezeActive ? 'rgba(100,180,255,0.45)' : 'rgba(255,107,53,0.45)', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Ionicons name={freezeActive ? 'snow-outline' : 'flame'} size={Math.round(f.numLg * 1.1)} color={freezeActive ? '#64B4FF' : '#FF6B35'} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg + 4, fontWeight: '700' }} numberOfLines={1}>{totalStreak}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption }}>{triLang(lang, { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: '#64B4FF', fontSize: f.h1, fontWeight: '700' }}>{bestStreak}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.label }}>{triLang(lang, { ru: 'лучший', uk: 'найкращий', es: 'récord' })}</Text>
          {totalStreak >= 3 && (
            <TouchableOpacity
              style={{ flexDirection:'row', alignItems:'center', gap:4 }}
              onPress={async () => {
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
                await Share.share({ message: msg }).catch(() => {});
              }}
            >
              <Ionicons name="share-outline" size={14} color={t.textGhost}/>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
              </Text>
            </TouchableOpacity>
          )}
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
          const done = dayInfo?.active || false;
          const isToday = i === todayIdx;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={[
                { width: 22, height: 22, borderRadius: 11, backgroundColor: t.border },
                done && { backgroundColor: '#FF6B35' },
                isToday && !done && { backgroundColor: t.border, borderWidth: 2, borderColor: t.textPrimary },
              ]} />
              <Text style={{ color: isToday ? t.textPrimary : (done ? t.textPrimary : t.textGhost), fontSize: 12, fontWeight: isToday ? '700' : '600' }}>{d}</Text>
            </View>
          );
        })}
      </View>
      {percentilesStreak !== null && percentilesStreak >= 10 && totalStreak > 0 && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: 'rgba(255,107,53,0.10)', borderRadius: 10,
          padding: 10, marginTop: 10,
          borderWidth: 0.5, borderColor: 'rgba(255,107,53,0.3)',
        }}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.label, flex: 1, lineHeight: f.label * 1.4 }}>
            {triLang(lang, {
              ru: `Ваша цепочка ${totalStreak} дн. обходит ${percentilesStreak}% пользователей`,
              uk: `Ваш ланцюжок ${totalStreak} дн. обганяє ${percentilesStreak}% користувачів`,
              es: `Tu racha de ${totalStreak} días supera al ${percentilesStreak}% de usuarios`,
            })}
          </Text>
        </View>
      )}
      <View style={{ marginTop: 14 }}>
        {chainShieldDays > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#A78BFA" />
            <Text style={{ color: purpleColor, fontSize: f.body, fontWeight: '600', flex: 1 }}>
              {triLang(lang, {
                ru: `Заморозка активна: ${chainShieldDays} дней`,
                uk: `Заморозка активна: ${chainShieldDays} дн.`,
                es: `Congelación activa: ${chainShieldDays} días`,
              })}
            </Text>
          </View>
        )}
        {freezeActive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(100,180,255,0.12)', borderRadius: 12, padding: 12 }}>
            <Ionicons name="snow-outline" size={20} color="#64B4FF" />
            <Text style={{ color: '#64B4FF', fontSize: f.body, fontWeight: '600', flex: 1 }}>
              {triLang(lang, {
                ru: 'Цепочка заморожена на сегодня',
                uk: 'Ланцюжок заморожено на сьогодні',
                es: 'Racha congelada por hoy',
              })}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onFreezePress}
            disabled={chainShieldDays > 0}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#64B4FF', paddingVertical: 11, paddingHorizontal: 16, opacity: chainShieldDays > 0 ? 0.4 : 1 }}
          >
            <Ionicons name="snow-outline" size={18} color="#64B4FF" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#64B4FF', fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, { ru: 'Заморозить цепочку', uk: 'Заморозити ланцюжок', es: 'Congelar la racha' })}
              </Text>
              {isPremium && premiumFreezeUsed ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>{freezeShardCost}</Text>
                  <Image source={oskolokImageForPackShards(freezeShardCost)} style={{ width: 14, height: 14 }} />
                </View>
              ) : (
                <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1 }}>
                  {isPremium
                    ? triLang(lang, { ru: 'Бесплатно (Премиум)', uk: 'Безкоштовно (Преміум)', es: 'Gratis (Premium)' })
                    : triLang(lang, { ru: 'Нужен Премиум', uk: 'Потрібен Преміум', es: 'Se necesita Premium' })}
                </Text>
              )}
            </View>
            {!isPremium && <Ionicons name="lock-closed-outline" size={16} color={t.textGhost} />}
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

function LearningCoachCard({
  t,
  f,
  lang,
  metrics,
  showAction,
  onAction,
}: {
  t: any;
  f: any;
  lang: Lang;
  metrics: LearningCoachMetrics;
  showAction: boolean;
  onAction: () => void;
}) {
  const daysToGoodRhythm = Math.max(0, 5 - metrics.active7);
  const rhythmValue = daysToGoodRhythm === 0
    ? triLang(lang, { ru: 'ровно', uk: 'рівно', es: 'estable' })
    : triLang(lang, { ru: `+${daysToGoodRhythm} дн.`, uk: `+${daysToGoodRhythm} дн.`, es: `+${daysToGoodRhythm} d.` });
  const focusValue = metrics.avgMinutesActive >= 12
    ? triLang(lang, { ru: 'достаточно', uk: 'достатньо', es: 'bien' })
    : humanMinutes(metrics.avgMinutesActive, lang);
  const streakValue = metrics.totalStreak > 0
    ? triLang(lang, { ru: 'держится', uk: 'тримається', es: 'activa' })
    : triLang(lang, { ru: 'сегодня', uk: 'сьогодні', es: 'hoy' });
  const learningSignals = [
    {
      icon: 'calendar-outline' as const,
      label: triLang(lang, { ru: 'Частота', uk: 'Частота', es: 'Frecuencia' }),
      value: rhythmValue,
      hint: daysToGoodRhythm === 0
        ? triLang(lang, { ru: 'На этой неделе хватает регулярности.', uk: 'Цього тижня регулярності вистачає.', es: 'Esta semana hay buena regularidad.' })
        : triLang(lang, { ru: `Еще ${daysToGoodRhythm} активн. дн. до спокойного темпа.`, uk: `Ще ${daysToGoodRhythm} акт. дн. до спокійного темпу.`, es: `${daysToGoodRhythm} d. más para un ritmo cómodo.` }),
    },
    {
      icon: 'time-outline' as const,
      label: triLang(lang, { ru: 'Длина занятий', uk: 'Довжина занять', es: 'Duración' }),
      value: focusValue,
      hint: metrics.avgMinutesActive >= 12
        ? triLang(lang, { ru: 'Сессии уже не слишком короткие.', uk: 'Сесії вже не надто короткі.', es: 'Las sesiones ya tienen buen tamaño.' })
        : triLang(lang, { ru: 'Цель: около 10-12 минут за подход.', uk: 'Ціль: близько 10-12 хвилин за підхід.', es: 'Meta: unos 10-12 minutos por sesión.' }),
    },
    {
      icon: 'flame-outline' as const,
      label: triLang(lang, { ru: 'Серия', uk: 'Серія', es: 'Racha' }),
      value: streakValue,
      hint: metrics.totalStreak > 0
        ? triLang(lang, { ru: `${metrics.totalStreak} дн. подряд поддерживают привычку.`, uk: `${metrics.totalStreak} дн. поспіль підтримують звичку.`, es: `${metrics.totalStreak} d. seguidos sostienen el hábito.` })
        : triLang(lang, { ru: 'Одной короткой практики хватит для старта.', uk: 'Однієї короткої практики вистачить для старту.', es: 'Una práctica corta basta para empezar.' }),
    },
  ];
  return (
    <LinearGradient
      colors={statsCardGradient(t)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="stats-learning-health-card"
      style={{ borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(93, 213, 145, 0.35)', overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 8, borderColor: metrics.scoreColor, alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.border}` }}>
          <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '900', lineHeight: 32 }}>{metrics.score}</Text>
          <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '800' }}>/100</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {triLang(lang, { ru: 'Баланс практики', uk: 'Баланс практики', es: 'Balance de práctica' })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginTop: 4 }} numberOfLines={2}>
            {metrics.status}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35, marginTop: 6 }}>
            {metrics.scoreHint}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14, borderRadius: 16, padding: 10, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
          {triLang(lang, { ru: 'Что поможет сейчас', uk: 'Що допоможе зараз', es: 'Qué ayuda ahora' })}
        </Text>
        <View style={{ gap: 8 }}>
          {learningSignals.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: metrics.scoreColor + '24', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon} size={17} color={metrics.scoreColor} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 2 }} numberOfLines={2}>
                  {item.hint}
                </Text>
              </View>
              <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '900', maxWidth: 76, textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {showAction ? (
        <View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: metrics.scoreColor + '26', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={19} color={metrics.scoreColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>{metrics.actionTitle}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 4 }}>{metrics.actionBody}</Text>
            </View>
          </View>
          <TouchableOpacity testID="stats-today-action" onPress={onAction} activeOpacity={0.86} style={{ marginTop: 12, borderRadius: 13, paddingVertical: 12, alignItems: 'center', backgroundColor: metrics.scoreColor }}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{metrics.actionCta}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function RhythmWeekCard({
  t,
  f,
  lang,
  metrics,
}: {
  t: any;
  f: any;
  lang: Lang;
  metrics: LearningCoachMetrics;
}) {
  const maxCombined = Math.max(1, ...metrics.rhythmDays.map((d) => d.combined));
  const facts = [
    {
      icon: 'calendar-outline' as const,
      label: triLang(lang, { ru: 'Неделя', uk: 'Тиждень', es: 'Semana' }),
      value: `${metrics.active7}/7`,
      hint: triLang(lang, { ru: 'Сколько дней реально была практика.', uk: 'Скільки днів реально була практика.', es: 'Días con práctica real.' }),
    },
    {
      icon: 'time-outline' as const,
      label: triLang(lang, { ru: 'Время', uk: 'Час', es: 'Tiempo' }),
      value: humanMinutes(metrics.minutes7, lang),
      hint: triLang(lang, { ru: 'Сумма минут за 7 дней.', uk: 'Сума хвилин за 7 днів.', es: 'Minutos totales de 7 días.' }),
    },
    {
      icon: 'flash-outline' as const,
      label: triLang(lang, { ru: 'XP', uk: 'XP', es: 'XP' }),
      value: String(metrics.xp7),
      hint: triLang(lang, { ru: 'Сумма XP за последние 7 дней.', uk: 'Сума XP за останні 7 днів.', es: 'XP total de los últimos 7 días.' }),
    },
  ];
  return (
    <LinearGradient
      colors={statsCardGradient(t)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="stats-rhythm-week-card"
      style={{ borderRadius: 22, padding: 16, borderWidth: 1, borderColor: metrics.scoreColor + '44', overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {triLang(lang, { ru: 'Ритм недели', uk: 'Ритм тижня', es: 'Ritmo semanal' })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h3 ?? f.bodyLg, fontWeight: '900', marginTop: 3 }}>
            {triLang(lang, {
              ru: `Лучший день: ${metrics.bestDayLabel} · слабый: ${metrics.weakDayLabel}`,
              uk: `Найкращий день: ${metrics.bestDayLabel} · слабкий: ${metrics.weakDayLabel}`,
              es: `Mejor día: ${metrics.bestDayLabel} · flojo: ${metrics.weakDayLabel}`,
            })}
          </Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: metrics.scoreColor + '24', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="pulse" size={23} color={metrics.scoreColor} />
        </View>
      </View>

      <View style={{ marginBottom: 14, borderRadius: 16, padding: 10, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }}>
        <View style={{ height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 2 }}>
          {metrics.rhythmDays.map((d) => {
            const barH = d.active ? Math.max(14, Math.round((d.combined / maxCombined) * 82)) : 8;
            return (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Text style={{ color: d.isToday ? t.textPrimary : t.textGhost, fontSize: 9, fontWeight: '800' }} numberOfLines={1}>
                  {d.points > 0 ? `${d.points} XP` : humanMinutes(d.minutes, lang)}
                </Text>
                <View style={{ height: 82, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                  <View style={{ width: '76%', maxWidth: 28, height: barH, borderRadius: 8, backgroundColor: d.active ? metrics.scoreColor : t.border, opacity: d.active ? 1 : 0.5 }} />
                </View>
                <Text style={{ color: d.isToday ? t.textPrimary : t.textMuted, fontSize: 10, fontWeight: d.isToday ? '900' : '700' }}>{d.shortLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {facts.map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: metrics.scoreColor + '24', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon} size={17} color={metrics.scoreColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{item.label}: {item.value}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, lineHeight: f.label * 1.3, marginTop: 2 }}>{item.hint}</Text>
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

export default function StreakStats() {
  const router = useRouter();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const isLightTheme = false;
  const purpleColor = isDark ? '#9B59F5' : '#6B21D4';
  const { lang } = useLang();
  const wdays = streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY);

  // Initialise from pre-loaded cache so the screen shows real data immediately
  const _sc = getStatsCache();

  const [statsReady, setStatsReady]      = useState(_sc.loaded);
  const [days, setDays]                  = useState<DayData[]>(() => labelCachedDayRows(_sc.days, wdays));
  const [allDays, setAllDays]            = useState<DayData[]>(() => labelCachedDayRows(_sc.allDays, wdays));
  const [allTimeDays, setAllTimeDays]    = useState<TimeDayData[]>(() => labelCachedTimeDayRows(_sc.allTimeDays, wdays));
  const [totalStreak, setTotalStreak]    = useState(_sc.totalStreak);
  const [bestStreak, setBestStreak]      = useState(_sc.bestStreak);
  const [, setTotalPoints]    = useState(_sc.totalPoints);
  const [, setActiveDays] = useState(_sc.activeDays);
  const [weekPoints, setWeekPoints]      = useState(_sc.weekPoints);
  const [, setMyName]              = useState(_sc.myName);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[number]>(() =>
    LEAGUES.find(l => l.id === (_sc.engineLeagueId != null ? _sc.engineLeagueId : 0)) ?? LEAGUES[0],
  );
  const { isPremium }                            = usePremium();
  /** Тестер «Снять премиум»: иначе devUnlock ниже перекрывает блюр, хотя isPremium уже false. */
  const [testerStripsPremium, setTesterStripsPremium] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void AsyncStorage.getItem('tester_no_premium').then((v) => {
        if (!cancelled) setTesterStripsPremium(v === 'true');
      });
      return () => { cancelled = true; };
    }, []),
  );
  /** В dev-сборках без «магазинного» флага — снимаем блюр и открываем «Весь путь». Не при симуляции бесплатного. */
  const statsDevUnlock =
    ENABLE_DEV_TOOLS && !testerStripsPremium;
  const [freezeActive, setFreezeActive]         = useState(_sc.freezeActive);
  const [, setStreakAtRisk]          = useState(_sc.streakAtRisk);
  const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(_sc.premiumFreezeUsed);
  const [comebackActive, setComebackActive]      = useState(_sc.comebackActive);
  const [clubBoostMultiplier, setClubBoostMultiplier] = useState(_sc.clubBoostMultiplier);
  // stationary_clubs feature удалён, мультипликатор фиксирован 1.
  const stationaryClubMultiplier = 1;
  const [clubBoostExpiresAt, setClubBoostExpiresAt]   = useState(_sc.clubBoostExpiresAt);
  const [shardsBalance, setShardsBalance]        = useState(_sc.shardsBalance);
  const [clubBoostTimeLeft,  setClubBoostTimeLeft]    = useState('');
  const [leagueBoostMultiplier, setLeagueBoostMultiplier] = useState(1);
  const [leagueBoostExpiresAt, setLeagueBoostExpiresAt] = useState(0);
  const [leagueBoostTimeLeft, setLeagueBoostTimeLeft] = useState('');
  const [giftMultiplier, setGiftMultiplier]           = useState(_sc.giftMultiplier);
  const [giftExpiresAt, setGiftExpiresAt]             = useState(_sc.giftExpiresAt);
  const [giftXpBankRemaining, setGiftXpBankRemaining] = useState(_sc.giftXpBankRemaining);
  const [giftTimeLeft,  setGiftTimeLeft]              = useState('');
  const [chainShieldDays, setChainShieldDays]         = useState(_sc.chainShieldDays);
  const [clubDescVisible, setClubDescVisible]   = useState(false);
  const [, setHadPremiumEver]     = useState(_sc.hadPremiumEver);
  const [trainerPracticeDue, setTrainerPracticeDue] = useState(_sc.trainerPracticeDue);
  const [achievementCount, setAchievementCount] = useState(0);
  const [freezeConfirmVisible, setFreezeConfirmVisible] = useState(false);
  const [freezeNeedShardsModal, setFreezeNeedShardsModal] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(true);
  const FREEZE_COST_SHARDS = 3;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadAchievementStates()
        .then(states => {
          if (!cancelled) setAchievementCount(states.filter(s => s.unlockedAt !== null).length);
        })
        .catch(() => {
          if (!cancelled) setAchievementCount(0);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const scrollRef     = useRef<any>(null);
  const chartScrollRef = useRef<any>(null);
  /** «Опыт» | «Время» — один блок графика по дням. */
  const [dailyChartTab, setDailyChartTab] = useState<'xp' | 'time'>('xp');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const today = toDateStr(new Date());
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeProfileStats | null>(null);
  const [percentiles, setPercentiles] = useState<AllPercentiles>({ xp: null, streak: null, weekXp: null, daily7xp: null, daily7timeMs: null, arenaXp: null, totalUsers: 0 });
  const [myXp7, setMyXp7] = useState(0);
  const [myTime7ms, setMyTime7ms] = useState(0);
  const coachMetrics = useMemo(
    () => buildLearningCoachMetrics(allDays.length > 0 ? allDays : days, allTimeDays, totalStreak, lang),
    [allDays, days, allTimeDays, totalStreak, lang],
  );

  const [expandedLifetimeKind, setExpandedLifetimeKind] = useState<LifetimeTotalsChartKind | null>(null);
  const [lifetimeChartDays, setLifetimeChartDays] = useState<LifetimeChartDay[]>([]);
  const [lifetimeChartLoading, setLifetimeChartLoading] = useState(false);
  /** Сброс загрузки графиков «Весь путь» после dev-рандома (AsyncStorage). */
  const [lifetimeChartSeed, setLifetimeChartSeed] = useState(0);
  const [devLifetimeChartsBusy, setDevLifetimeChartsBusy] = useState(false);
  /** Dev: графики под всеми строками «Весь путь» + серии по каждой метрике */
  const [devLifetimeAllCharts, setDevLifetimeAllCharts] = useState(false);
  const [lifetimePathChartsByKind, setLifetimePathChartsByKind] = useState<
    Partial<Record<LifetimeTotalsChartKind, LifetimeChartDay[]>>
  >({});
  const lifetimeChartScrollRef = useRef<any>(null);
  const activity365YRef = useRef<number | null>(null);
  const params = useLocalSearchParams<{ qa365?: string }>();

  useEffect(() => {
    if (params.qa365 !== '1') return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const y = activity365YRef.current;
      if (typeof y === 'number') {
        scrollRef.current?.scrollTo?.({ x: 0, y: Math.max(0, y - 12), animated: true });
        clearInterval(timer);
        return;
      }
      if (attempts >= 20) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [params.qa365]);

  useEffect(() => {
    if (devLifetimeAllCharts) return;
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
        if (!cancelled && series) setLifetimeChartDays(series);
      })
      .catch(() => {
        if (!cancelled) setLifetimeChartDays([]);
      })
      .finally(() => {
        if (!cancelled) setLifetimeChartLoading(false);
      });
    return () => { cancelled = true; };
  }, [expandedLifetimeKind, lang, lifetimeChartSeed, devLifetimeAllCharts]);

  useEffect(() => {
    if (!expandedLifetimeKind || devLifetimeAllCharts) return;
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
  }, [wdays]);

  const loadAll = React.useCallback(async () => {
    await hydrateStatsCacheFromStorage();
    const cachedSnapshot = getStatsCache();
    if (cachedSnapshot.loaded) applyStatsSnapshot(cachedSnapshot);

    try {
      const cachedLifetime = await readLifetimeProfileStatsCache();
      if (cachedLifetime) setLifetimeStats(cachedLifetime);
    } catch { /* ignore */ }

    const lifetimeRefresh = loadLifetimeProfileStats()
      .then(setLifetimeStats)
      .catch(() => {});

    const snapshot = await refreshStatsCache();
    if (snapshot) applyStatsSnapshot(snapshot);

    const activeLeagueBoost = await loadActiveLeagueBoost().catch(() => null);
    setLeagueBoostMultiplier(activeLeagueBoost?.multiplier ?? 1);
    setLeagueBoostExpiresAt(activeLeagueBoost?.expiresAt ?? 0);

    await lifetimeRefresh;

    // Синк аналитики + перцентиль (не блокирует рендер — запускаем после основной загрузки)
    void syncDailyAnalyticsIfNeeded();
    loadPercentileData().then(({ myXp7: x7, myTime7ms: t7, percentiles: p }) => {
      setMyXp7(x7);
      setMyTime7ms(t7);
      setPercentiles(p);
    }).catch(() => {});
  }, [applyStatsSnapshot]);

  // Reload data when screen regains focus (e.g. after tester functions).
  useFocusEffect(React.useCallback(() => {
    void loadAll();
    return undefined;
  }, [loadAll]));

  const randomizeLifetimeChartsForDev = React.useCallback(async () => {
    if (!ENABLE_DEV_TOOLS) return;
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
      await Promise.all(
        LIFETIME_PATH_DEV_CHART_KINDS.map(async (k) => {
          const series = await loadLifetimeTotalsChartDays(k, lang, REPORT_SCREENS_RUSSIAN_ONLY);
          if (series) byKind[k] = series;
        }),
      );
      setLifetimePathChartsByKind(byKind);
      setDevLifetimeAllCharts(true);
    } finally {
      setDevLifetimeChartsBusy(false);
    }
  }, [loadAll, lang]);

  useEffect(() => {
    const sub = onAppEvent('xp_changed', () => {
      void loadAll();
    });
    return () => sub.remove();
  }, [loadAll]);

  // Таймер обратного отсчёта для клубного буста XP
  useEffect(() => {
    if (!clubBoostExpiresAt || clubBoostMultiplier <= 1) { setClubBoostTimeLeft(''); return; }
    const fmt = () => {
      const ms = clubBoostExpiresAt - Date.now();
      if (ms <= 0) { setClubBoostTimeLeft(''); setClubBoostMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setClubBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
    };
    fmt();
    const timer = setInterval(fmt, 1000);
    return () => clearInterval(timer);
  }, [clubBoostExpiresAt, clubBoostMultiplier]);

  // Таймер обратного отсчёта для персонального буста лиги
  useEffect(() => {
    if (!leagueBoostExpiresAt || leagueBoostMultiplier <= 1) { setLeagueBoostTimeLeft(''); return; }
    const fmt = () => {
      const ms = leagueBoostExpiresAt - Date.now();
      if (ms <= 0) { setLeagueBoostTimeLeft(''); setLeagueBoostMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeagueBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
    };
    fmt();
    const timer = setInterval(fmt, 1000);
    return () => clearInterval(timer);
  }, [leagueBoostExpiresAt, leagueBoostMultiplier]);

  // Таймер обратного отсчёта для подарочного множителя XP
  useEffect(() => {
    if (!giftExpiresAt || giftMultiplier <= 1) { setGiftTimeLeft(''); return; }
    const fmt = () => {
      const ms = giftExpiresAt - Date.now();
      if (ms <= 0) { setGiftTimeLeft(''); setGiftMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setGiftTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
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
    } else {
      doFreezeStreak(true);
    }
  };

  const doFreezeStreak = async (free: boolean) => {
    const today = toDateStr(new Date());
    if (free) {
      await AsyncStorage.setItem('premium_free_freeze_used', 'true');
      setPremiumFreezeUsed(true);
    } else {
      const ok = await spendShards(FREEZE_COST_SHARDS, 'streak_freeze');
      if (!ok) {
        setFreezeNeedShardsModal(true);
        return;
      }
      setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
    }
    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    setFreezeActive(true);
    setStreakAtRisk(false);
  };

  return (
    <ScreenGradient>
    <SafeAreaView testID="screen-streak-stats" style={{ flex: 1 }}>

      {/* Подтверждение траты осколков на заморозку */}
      <Modal transparent visible={freezeConfirmVisible} animationType="fade" onRequestClose={() => setFreezeConfirmVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFreezeConfirmVisible(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>❄️</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {triLang(lang, { ru: 'Заморозить цепочку?', uk: 'Заморозити ланцюжок?', es: '¿Congelar la racha?' })}
            </Text>
            <View style={{ alignItems: 'center', marginBottom: 20, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, { ru: 'Стоимость:', uk: 'Вартість:', es: 'Coste:' })}</Text>
                <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, { ru: 'Баланс:', uk: 'Баланс:', es: 'Saldo:' })}</Text>
                <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setFreezeConfirmVisible(false)}
                style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setFreezeConfirmVisible(false); doFreezeStreak(false); }}
                style={{ flex: 1, borderRadius: 14, backgroundColor: '#64B4FF', paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Заморозить', uk: 'Заморозити', es: 'Congelar' })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 28 : 15, paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>
          {triLang(lang, { ru: 'Статистика', uk: 'Статистика', es: 'Estadísticas' })}
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          testID="stats-header-achievements"
          accessibilityHint={triLang(lang, {
            ru: ruAchievementRewardPhrase(achievementCount),
            uk: ukAchievementRewardPhrase(achievementCount),
            es: `${achievementCount} recompensa${achievementCount === 1 ? '' : 's'}`,
          })}
          activeOpacity={0.82}
          onPress={() => {
            hapticTap();
            router.push('/achievements_screen' as any);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border }}
        >
          <Ionicons name="trophy-outline" size={17} color={t.textSecond} />
          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }} numberOfLines={1}>
            {triLang(lang, {
              ru: ruAchievementRewardPhrase(achievementCount),
              uk: ukAchievementRewardPhrase(achievementCount),
              es: `${achievementCount} recompensa${achievementCount === 1 ? '' : 's'}`,
            })}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        pointerEvents={statsReady ? 'auto' : 'none'}
        style={{ opacity: statsReady ? 1 : 0 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <StreakStatsHero
          t={t}
          f={f}
          lang={lang}
          totalStreak={totalStreak}
          bestStreak={bestStreak}
          days={days}
          freezeActive={freezeActive}
          chainShieldDays={chainShieldDays}
          purpleColor={purpleColor}
          isPremium={isPremium}
          premiumFreezeUsed={premiumFreezeUsed}
          freezeShardCost={FREEZE_COST_SHARDS}
          shardsBalance={shardsBalance}
          onFreezePress={handleFreezeStreak}
          percentilesStreak={percentiles.streak}
        />

        {/* XP MULTIPLIERS BLOCK */}
        {(() => {
          const streakM = totalStreak >= 30 ? 1.8 : totalStreak >= 14 ? 1.6 : totalStreak >= 7 ? 1.4 : totalStreak >= 3 ? 1.2 : 1;
          const clubWeekTierM = 1 + engineLeague.id * 0.1;
          const clubCombinedM = clubBoostMultiplier + clubWeekTierM + stationaryClubMultiplier - 2;
          const comebackM = comebackActive ? 2 : 1;
          const total = 1 + (streakM - 1) + (clubCombinedM - 1) + (leagueBoostMultiplier - 1) + (comebackM - 1) + (giftMultiplier - 1);
          const hasBonus = total > 1;
          const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
          const items: { key: string; label: string; value: string; color: string; active: boolean }[] = [
            { key: 'streak', label: triLang(lang, { ru: 'Цепочка', uk: 'Ланцюжок', es: 'Racha' }), value: pct(streakM), color: '#FF6B35', active: streakM > 1 },
            { key: 'club', label: triLang(lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga' }), value: pct(clubCombinedM), color: t.gold, active: clubCombinedM > 1 },
            { key: 'league_boost', label: triLang(lang, { ru: 'Буст лиги', uk: 'Буст ліги', es: 'Impulso de liga' }), value: pct(leagueBoostMultiplier), color: '#A78BFA', active: leagueBoostMultiplier > 1 },
            { key: 'comeback', label: triLang(lang, { ru: 'Возврат', uk: 'Повернення', es: 'Bonificación de retorno' }), value: pct(comebackM), color: '#60A5FA', active: comebackActive },
            { key: 'gift', label: triLang(lang, { ru: 'Подарок уровня', uk: 'Подарунок рівня', es: 'Regalo de nivel' }), value: pct(giftMultiplier), color: purpleColor, active: giftMultiplier > 1 },
          ];
          const activeItems = items.filter(i => i.active);
          const bonusAccent = hasBonus ? '#C9A84C' : `${t.accent}59`;
          if (!bonusOpen) {
            return (
              <TouchableOpacity
                testID="stats-bonus-collapsed"
                activeOpacity={0.84}
                onPress={() => {
                  hapticTap();
                  setBonusOpen(true);
                }}
              >
                <LinearGradient
                  colors={statsCardGradient(t)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: bonusAccent, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: hasBonus ? 'rgba(201,168,76,0.18)' : `${t.accent}26`, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="sparkles-outline" size={22} color={hasBonus ? '#C9A84C' : t.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, { ru: 'Бонус к XP', uk: 'Бонус до XP', es: 'Bono de XP' })}: ×{total.toFixed(2)}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, lineHeight: f.caption * 1.35, marginTop: 3 }}>
                      {activeItems.length > 0
                        ? triLang(lang, {
                            ru: `${activeItems.length} активных источника. Открой, если хочешь понять откуда берется множитель.`,
                            uk: `${activeItems.length} активних джерела. Відкрий, якщо хочеш зрозуміти звідки множник.`,
                            es: `${activeItems.length} fuentes activas. Abre para ver de dónde sale el multiplicador.`,
                          })
                        : triLang(lang, {
                            ru: 'Сейчас дополнительных бонусов нет. Это не влияет на план обучения.',
                            uk: 'Зараз додаткових бонусів немає. Це не впливає на план навчання.',
                            es: 'Ahora no hay bonos extra. No afecta tu plan de estudio.',
                          })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.45)" />
                </LinearGradient>
              </TouchableOpacity>
            );
          }
          return (
            <LinearGradient
              colors={statsCardGradient(t)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              testID="stats-bonus-expanded"
              style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: bonusAccent, overflow: 'hidden' }}
            >
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => {
                  hapticTap();
                  setBonusOpen(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeItems.length > 0 ? 10 : 0 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {triLang(lang, {
                  ru: 'Активные множители опыта',
                  uk: 'Активні множники досвіду',
                  es: 'Multiplicadores de experiencia activos',
                })}
                </Text>
                <Text style={{ color: hasBonus ? '#C9A84C' : t.textGhost, fontSize: f.bodyLg, fontWeight: '900' }}>
                  ×{total.toFixed(2)}
                </Text>
              </TouchableOpacity>
              {activeItems.length === 0 ? (
                <Text style={{ color: t.textGhost, fontSize: f.caption, marginTop: 6 }}>
                  {triLang(lang, { ru: 'Нет активных бонусов', uk: 'Немає активних бонусів', es: 'No hay bonificaciones activas' })}
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {activeItems.map(item => {
                    const isGiftItem = item.key === 'gift';
                    const isClubRow = item.key === 'club';
                    const isLeagueBoostRow = item.key === 'league_boost';
                    const giftMeta = giftXpBankRemaining > 0
                      ? triLang(lang, {
                          ru: `×2 ещё на ${giftXpBankRemaining} XP`,
                          uk: `×2 ще на ${giftXpBankRemaining} XP`,
                          es: `×2 por ${giftXpBankRemaining} XP más`,
                        })
                      : giftTimeLeft;
                    return (
                      <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>{item.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: item.color, fontSize: f.caption, fontWeight: '700' }}>{item.value}</Text>
                          {isGiftItem && !!giftMeta && (
                            <Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{giftMeta}</Text>
                          )}
                          {isClubRow && clubBoostMultiplier > 1 && !!clubBoostTimeLeft && (
                            <Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{clubBoostTimeLeft}</Text>
                          )}
                          {isLeagueBoostRow && leagueBoostMultiplier > 1 && !!leagueBoostTimeLeft && (
                            <Text style={{ color: t.textGhost, fontSize: f.caption - 1, fontWeight: '500' }}>{leagueBoostTimeLeft}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </LinearGradient>
          );
        })()}

        <StatsPremiumBlur isPremium={isPremium} context="stats" devUnlock={statsDevUnlock}>
          <LearningCoachCard
            t={t}
            f={f}
            lang={lang}
            metrics={coachMetrics}
            showAction={trainerPracticeDue >= STATS_TRAINER_ACTION_MIN_DUE}
            onAction={() => {
              hapticTap();
              router.push('/trainer' as any);
            }}
          />
        </StatsPremiumBlur>

        <StatsPremiumBlur isPremium={isPremium} context="stats" devUnlock={statsDevUnlock}>
          <RhythmWeekCard
            t={t}
            f={f}
            lang={lang}
            metrics={coachMetrics}
          />
        </StatsPremiumBlur>

        {/* Годовая карта активности (~365 дней); премиум — без блюра. */}
        <StatsPremiumBlur isPremium={isPremium} context="heatmap" devUnlock={statsDevUnlock}>
        <View
          testID="stats-activity-365"
          onLayout={(event) => {
            activity365YRef.current = event.nativeEvent.layout.y;
          }}
        >
          <ActivityHeatmap365 />
        </View>
        </StatsPremiumBlur>

        {/* Перцентили — единый блок */}
        {(() => {
          const pItems: { icon: string | null; emoji: string | null; color: string; text: string }[] = [];
          if (percentiles.xp !== null && percentiles.xp >= 10)
            pItems.push({ icon: null, emoji: '🏆', color: '#C9A84C', text: triLang(lang, {
              ru: `По суммарному опыту вы обошли ${percentiles.xp}% пользователей`,
              uk: `За сумарним досвідом ви обігнали ${percentiles.xp}% користувачів`,
              es: `En XP total superas al ${percentiles.xp}% de los usuarios`,
            }) });
          if (percentiles.weekXp !== null && percentiles.weekXp >= 10)
            pItems.push({ icon: null, emoji: '📅', color: t.accent, text: triLang(lang, {
              ru: `На этой неделе вы обошли ${percentiles.weekXp}% пользователей по опыту`,
              uk: `Цього тижня ви обігнали ${percentiles.weekXp}% користувачів за досвідом`,
              es: `Esta semana superaste al ${percentiles.weekXp}% de los usuarios en XP`,
            }) });
          if (percentiles.daily7xp !== null && percentiles.daily7xp >= 10 && myXp7 > 0)
            pItems.push({ icon: 'trending-up-outline', emoji: null, color: '#7B8CFF', text: triLang(lang, {
              ru: `За последние 7 дней: ${myXp7} XP. Это выше, чем у ${percentiles.daily7xp}% пользователей.`,
              uk: `За останні 7 днів: ${myXp7} XP. Це вище, ніж у ${percentiles.daily7xp}% користувачів.`,
              es: `Últimos 7 días: ${myXp7} XP. Supera al ${percentiles.daily7xp}% de usuarios.`,
            }) });
          if (percentiles.daily7timeMs !== null && percentiles.daily7timeMs >= 10 && myTime7ms > 0)
            pItems.push({ icon: null, emoji: '⏱️', color: '#64B4FF', text: triLang(lang, {
              ru: `За последние 7 дней вы обошли ${percentiles.daily7timeMs}% пользователей по времени изучения`,
              uk: `За останні 7 днів ви обігнали ${percentiles.daily7timeMs}% користувачів за часом навчання`,
              es: `En los últimos 7 días superaste al ${percentiles.daily7timeMs}% de los usuarios en tiempo de estudio`,
            }) });
          if (pItems.length === 0) return null;
          return (
            <StatsPremiumBlur isPremium={isPremium} context="percentiles" devUnlock={statsDevUnlock}>
              <LinearGradient
                colors={statsCardGradient(t)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(201,168,76,0.45)', overflow: 'hidden' }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                  {triLang(lang, { ru: 'Ваш результат среди других', uk: 'Ваш результат серед інших', es: 'Tu resultado entre otros' })}
                </Text>
                <View style={{ gap: 8 }}>
                  {pItems.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 10, backgroundColor: t.bgSurface2 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: item.color + '24', alignItems: 'center', justifyContent: 'center' }}>
                        {item.icon
                          ? <Ionicons name={item.icon as any} size={17} color={item.color} />
                          : <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                        }
                      </View>
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, flex: 1, lineHeight: f.caption * 1.4, fontWeight: '600' }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </StatsPremiumBlur>
          );
        })()}

        {/* Два премиум-графика подряд; сразу под «Аналитика ошибок». */}
        <TouchableOpacity
          testID="stats-details-toggle"
          activeOpacity={0.84}
          onPress={() => {
            hapticTap();
            setDetailsOpen((v) => !v);
          }}
        >
          <LinearGradient
            colors={statsCardGradient(t)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: `${t.accent}59`, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${t.accent}26`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bar-chart-outline" size={22} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Архив', uk: 'Архів', es: 'Archivo' })}
              </Text>
            </View>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color="rgba(255,255,255,0.45)" />
          </LinearGradient>
        </TouchableOpacity>

        {detailsOpen && (
        <View testID="stats-details-expanded" style={{ gap: 12 }}>
        {/* График по дням: переключатель «Опыт» / «Время» — для !premium закрыт blur\'ом + lock CTA. */}
        <StatsPremiumBlur isPremium={isPremium} context="stats" devUnlock={statsDevUnlock}>
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
          return (
            <LinearGradient colors={t.cardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={{ borderRadius: 16, padding: 16, paddingBottom: 8, borderWidth: 0.5, borderColor: t.border }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  borderRadius: 12,
                  padding: 3,
                  backgroundColor: segBg,
                  borderWidth: 0.5,
                  borderColor: t.border,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticTap();
                    setDailyChartTab('xp');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: dailyChartTab === 'xp' ? segActive : 'transparent',
                    borderWidth: dailyChartTab === 'xp' ? 0.5 : 0,
                    borderColor: dailyChartTab === 'xp' ? t.border : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: dailyChartTab === 'xp' ? t.textPrimary : t.textMuted,
                      fontSize: f.body,
                      fontWeight: dailyChartTab === 'xp' ? '700' : '500',
                    }}
                  >
                    {triLang(lang, { ru: 'Опыт', uk: 'Досвід', es: 'XP' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticTap();
                    setDailyChartTab('time');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: dailyChartTab === 'time' ? segActive : 'transparent',
                    borderWidth: dailyChartTab === 'time' ? 0.5 : 0,
                    borderColor: dailyChartTab === 'time' ? t.border : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: dailyChartTab === 'time' ? t.textPrimary : t.textMuted,
                      fontSize: f.body,
                      fontWeight: dailyChartTab === 'time' ? '700' : '500',
                    }}
                  >
                    {triLang(lang, { ru: 'Время', uk: 'Час', es: 'Tiempo' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                key={dailyChartTab}
                ref={chartScrollRef}
                horizontal
                showsHorizontalScrollIndicator
                indicatorStyle="white"
                onLayout={() => chartScrollRef.current?.scrollToEnd?.({ animated: false })}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 12 }}
              >
                {dailyChartTab === 'xp'
                  ? chartDays.map((d, i) => {
                      const barH = d.points > 0 ? Math.max((d.points / maxAllPts) * CHART_H, 8) : 5;
                      const isToday = d.date === today;
                      const barColor = d.active
                        ? (isToday ? t.textPrimary : t.accent)
                        : (isToday ? t.border : t.bgSurface2 ?? t.border);
                      const ptsLabel = formatActivityBarPoints(d.points, lang);
                      return (
                        <View key={i} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                          <View style={{ height: CHART_VALUE_LABEL_H, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                            <Text
                              style={{
                                color: d.points > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                fontSize: 7,
                                fontWeight: '700',
                                textAlign: 'center',
                              }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.55}
                            >
                              {ptsLabel}
                            </Text>
                          </View>
                          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                            <View style={{
                              width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                              backgroundColor: barColor,
                              opacity: d.active ? 1 : 0.35,
                            }} />
                          </View>
                          <Text style={{
                            color: isToday ? t.textPrimary : t.textMuted,
                            fontSize: 8, fontWeight: isToday ? '800' : '400',
                            lineHeight: 11,
                          }} numberOfLines={1}>{d.shortLabel}</Text>
                          <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                        </View>
                      );
                    })
                  : timeDaysChart.map((d, i) => {
                      const barH = d.ms > 0 ? Math.max((d.ms / maxMs) * CHART_H, 8) : 5;
                      const isToday = d.date === today;
                      const barColor = d.active
                        ? (isToday ? t.textPrimary : t.accent)
                        : (isToday ? t.border : t.bgSurface2 ?? t.border);
                      const timeLabel = formatTimeBarMs(d.ms, lang);
                      return (
                        <View key={`t-${i}`} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                          <View style={{ height: CHART_VALUE_LABEL_H, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                            <Text
                              style={{
                                color: d.ms > 0 ? (isToday ? t.textPrimary : t.textSecond) : t.textGhost,
                                fontSize: 7,
                                fontWeight: '700',
                                textAlign: 'center',
                              }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.55}
                            >
                              {timeLabel}
                            </Text>
                          </View>
                          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                            <View style={{
                              width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                              backgroundColor: barColor,
                              opacity: d.active ? 1 : 0.35,
                            }} />
                          </View>
                          <Text style={{
                            color: isToday ? t.textPrimary : t.textMuted,
                            fontSize: 8, fontWeight: isToday ? '800' : '400',
                            lineHeight: 11,
                          }} numberOfLines={1}>{d.shortLabel}</Text>
                          <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                        </View>
                      );
                    })}
              </ScrollView>
            </LinearGradient>
          );
        })()}
        </StatsPremiumBlur>

        {lifetimeStats != null && (
          <StatsPremiumBlur isPremium={isPremium} context="stats" devUnlock={statsDevUnlock}>
            <LifetimeTotalsBlock
              t={{
                bgCard: t.bgCard,
                bgSurface: t.bgSurface,
                border: t.border,
                textPrimary: t.textPrimary,
                textSecond: t.textSecond,
                textMuted: t.textMuted,
                accent: t.accent,
              }}
              f={f}
              lang={lang}
              data={lifetimeStats}
              expandedKind={expandedLifetimeKind}
              onToggleMetric={(kind) => {
                if (!isPremium && !statsDevUnlock) return;
                setDevLifetimeAllCharts(false);
                setLifetimePathChartsByKind({});
                hapticTap();
                setExpandedLifetimeKind((prev) => (prev === kind ? null : kind));
              }}
              chartDays={lifetimeChartDays}
              chartLoading={lifetimeChartLoading}
              chartScrollRef={lifetimeChartScrollRef}
              showAllPathCharts={devLifetimeAllCharts}
              pathChartsByKind={lifetimePathChartsByKind}
            />
          </StatsPremiumBlur>
        )}
        {ENABLE_DEV_TOOLS && (
          <TouchableOpacity
            onPress={() => void randomizeLifetimeChartsForDev()}
            disabled={devLifetimeChartsBusy}
            activeOpacity={0.75}
            style={{
              marginBottom: 12,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: 'rgba(255, 180, 60, 0.14)',
              borderWidth: 1,
              borderColor: 'rgba(255, 160, 40, 0.45)',
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
              {triLang(lang, {
                ru: devLifetimeChartsBusy ? 'Генерация…' : 'Dev: случайные графики «Весь путь» (7 дн.)',
                uk: devLifetimeChartsBusy ? 'Генерація…' : 'Dev: випадкові графіки «Увесь шлях» (7 дн.)',
                es: devLifetimeChartsBusy ? 'Generando…' : 'Dev: gráficas aleatorias «Todo el camino» (7 d.)',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center', lineHeight: f.sub * 1.35 }}>
              {triLang(lang, {
                ru: 'Случайные значения за 7 дней: все строки и графики под ними; цифры слева = сумма за эти 7 дней (дни цепочки/уровень — как в профиле).',
                uk: 'Випадкові значення за 7 днів: усі рядки й графіки під ними; числа зліва = сума за ці 7 днів.',
                es: 'Valores aleatorios 7 días: todas las filas y gráficos debajo; la columna izquierda = suma de esos 7 días.',
              })}
            </Text>
          </TouchableOpacity>
        )}
        </View>
        )}



        {/* ── ПАРИ НА ЦЕПОЧКУ ───────────────────────────────────────────────── */}
        <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} />

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            hapticTap();
            router.push('/progress_map' as any);
          }}
        >
          <LinearGradient
            colors={statsCardGradient(t)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 14, borderWidth: 1, borderColor: `${t.accent}59`, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${t.accent}26`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="map-outline" size={22} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Карта прогресса', uk: 'Карта прогресу', es: 'Mapa de progreso' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={t.textGhost} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ReportErrorButton
            screen="streak_stats"
            dataId="streak_stats_main"
            dataText={triLang(lang, {
              ru: 'Цепочки и статистика',
              uk: 'Стріки та статистика',
              es: 'Rachas y estadísticas',
            })}
          />
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
      </ContentWrap>

      {/* Кастомный модал описания клуба — вместо системного Alert */}
      <Modal
        visible={clubDescVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClubDescVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setClubDescVisible(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 20, padding: 24, maxWidth: 360, borderWidth: 0.5, borderColor: t.border }}>
              {engineLeague.imageUri && (
                <Image source={engineLeague.imageUri} style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 12 }} resizeMode="contain" />
              )}
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: engineLeague.nameRU,
                  uk: engineLeague.nameUK,
                  es: engineLeague.nameES ?? engineLeague.nameRU,
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: engineLeague.descRU,
                  uk: engineLeague.descUK,
                  es: CLUB_DESC_ES[engineLeague.id] ?? engineLeague.descRU,
                })}
              </Text>
              {(() => {
                const xpHintRU: Record<number, string> = {
                  0:  `Ты только начинаешь — все занятия приносят стандартный опыт, бонус +0%.`,
                  1:  `Первый шаг сделан — все занятия приносят +10% опыта.`,
                  2:  `Ты нашёл свой путь — все занятия засчитываются с +20% опыта.`,
                  3:  `Практика приносит плоды — все занятия дают +30% опыта.`,
                  4:  `Острый ум — острый рост. Все занятия приносят +40% опыта.`,
                  5:  `Эрудиты учатся эффективнее — все занятия приносят +50% опыта.`,
                  6:  `Знаток своего дела — все занятия приносят +60% опыта.`,
                  7:  `Эксперты растут быстрее всех — все занятия приносят +70% опыта.`,
                  8:  `Магистры учатся с максимальной отдачей — все занятия приносят +80% опыта.`,
                  9:  `Мыслители видят глубже и дальше — все занятия приносят +90% опыта.`,
                  10: `Мастера выкладываются на полную — все занятия приносят +100% опыта.`,
                  11: `Вершина мастерства! Профессора получают максимальный бонус — все занятия приносят +110% опыта.`,
                };
                const xpHintUK: Record<number, string> = {
                  0:  `Ти тільки починаєш — всі заняття приносять стандартний досвід, бонус +0%.`,
                  1:  `Перший крок зроблено — всі заняття приносять +10% досвіду.`,
                  2:  `Ти знайшов свій шлях — всі заняття зараховуються з +20% досвіду.`,
                  3:  `Практика дає результат — всі заняття приносять +30% досвіду.`,
                  4:  `Гострий розум — стрімке зростання. Всі заняття приносять +40% досвіду.`,
                  5:  `Ерудити вчаться ефективніше — всі заняття приносять +50% досвіду.`,
                  6:  `Знавець своєї справи — всі заняття приносять +60% досвіду.`,
                  7:  `Експерти ростуть швидше за всіх — всі заняття приносять +70% досвіду.`,
                  8:  `Магістри вчаться з максимальною віддачею — всі заняття приносять +80% досвіду.`,
                  9:  `Мислителі бачать глибше і далі — всі заняття приносять +90% досвіду.`,
                  10: `Майстри викладаються на повну — всі заняття приносять +100% досвіду.`,
                  11: `Вершина майстерності! Професори отримують максимальний бонус — всі заняття приносять +110% досвіду.`,
                };
                const xpHintES: Record<number, string> = {
                  0:  `Empiezas desde cero: todas las actividades dan XP estándar, bonificación +0 %.`,
                  1:  `Primer paso: todas las actividades dan +10 % de XP.`,
                  2:  `Ya encontraste tu ritmo: todas las actividades cuentan con +20 % de XP.`,
                  3:  `La práctica da frutos: todas las actividades dan +30 % de XP.`,
                  4:  `Mente ágil, progreso rápido: todas las actividades dan +40 % de XP.`,
                  5:  `Quienes estudian con método ganan más: +50 % de XP en todas las actividades.`,
                  6:  `Dominas el proceso: todas las actividades dan +60 % de XP.`,
                  7:  `Los expertos avanzan más rápido: todas las actividades dan +70 % de XP.`,
                  8:  `Sacas el máximo a cada sesión: todas las actividades dan +80 % de XP.`,
                  9:  `Ves el idioma en profundidad: todas las actividades dan +90 % de XP.`,
                  10: `Das el cien por cien: todas las actividades dan +100 % de XP.`,
                  11: `¡Cima del recorrido! En la élite profesional todas las actividades dan +110 % de XP.`,
                };
                const hint = lang === 'uk'
                  ? xpHintUK[engineLeague.id]
                  : lang === 'es'
                    ? xpHintES[engineLeague.id]
                    : xpHintRU[engineLeague.id];
                return hint ? (
                  <Text style={{ color: t.gold, fontSize: f.body, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>
                    ⭐ {hint}
                  </Text>
                ) : null;
              })()}
              <TouchableOpacity
                onPress={() => setClubDescVisible(false)}
                style={{ marginTop: 20, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ThemedConfirmModal
        visible={freezeNeedShardsModal}
        title={triLang(lang, {
          ru: 'Недостаточно осколков',
          uk: 'Недостатньо осколків',
          es: 'No tienes suficientes fragmentos',
        })}
        messageNode={
          <View style={{ gap: 4, marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                  ru: 'Стоимость заморозки:',
                  uk: 'Вартість заморозки:',
                  es: 'Coste de congelar:',
                })}
              </Text>
              <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                  ru: 'Твой баланс:',
                  uk: 'Твій баланс:',
                  es: 'Tu saldo:',
                })}
              </Text>
              <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted} />
            </View>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'В магазин', uk: 'У магазин', es: 'A la tienda' })}
        onCancel={() => setFreezeNeedShardsModal(false)}
        onConfirm={() => {
          navigateAfterModalClose(
            () => setFreezeNeedShardsModal(false),
            () => router.push({
              pathname: '/shards_shop',
              params: {
                need: String(Math.max(0, FREEZE_COST_SHARDS - shardsBalance)),
                source: 'streak_stats_freeze',
              },
            } as any),
          );
        }}
      />

    </SafeAreaView>
    </ScreenGradient>
  );
}

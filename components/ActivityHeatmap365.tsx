import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  activity365MonthGridCells,
  emptyActivity365Day,
  latestObservedActivity365Date,
  loadActivity365Analytics,
  peekActivity365Analytics,
  type Activity365Analytics,
  type Activity365Day,
} from '../app/activity_365_analytics';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';

const YEAR_DAYS = 365;
const YEAR_GRID_ROWS = 7;
const YEAR_GRID_COLS = 53;
const YEAR_GRID_CELLS = YEAR_GRID_ROWS * YEAR_GRID_COLS;
const YEAR_CELL_GAP = 1;
const MONTH_CELL_GAP = 4;

type LoadStatus = 'loading' | 'ready' | 'error';
type MonthComparisonSummary = { activeDays: number; xp: number; minutes: number };
type CanonicalYearModel = {
  cells: Array<Activity365Day | null>;
  monthKeys: string[];
  todayKey: string;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return toDateKey(new Date(Date.UTC(year, month - 1, day + delta)));
}

function mondayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const normalized = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const suffix = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    return `${normalized}${suffix}`;
  }
  if (color.startsWith('rgb(')) {
    return color.replace(/^rgb\((.*)\)$/i, `rgba($1, ${alpha})`);
  }
  return color;
}

function localeForLang(lang: string): string {
  const locales: Record<string, string> = {
    ru: 'ru-RU',
    uk: 'uk-UA',
    es: 'es-ES',
    'pt-BR': 'pt-BR',
    vi: 'vi-VN',
    id: 'id-ID',
    tr: 'tr-TR',
    pl: 'pl-PL',
  };
  return locales[lang] ?? 'en-US';
}

function formatMonth(monthKey: string, lang: string, withYear: boolean): string {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat(localeForLang(lang), {
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatSelectedDay(dateKey: string, lang: string): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(localeForLang(lang), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function copy(
  lang: string,
  values: { ru: string; uk?: string; es?: string; 'pt-BR'?: string; vi?: string; id?: string; tr?: string; pl?: string; en: string },
): string {
  return values[lang as keyof typeof values] ?? values.en;
}

function buildCanonicalYear(days: readonly Activity365Day[]): CanonicalYearModel {
  const todayKey = latestObservedActivity365Date(days) ?? toDateKey(new Date());
  const firstDateKey = addUtcDays(todayKey, -(YEAR_DAYS - 1));
  const leadingBlanks = mondayIndex(firstDateKey);
  const byDate = new Map(days.filter((day) => !day.future).map((day) => [day.date, day]));
  const cells: Array<Activity365Day | null> = Array.from({ length: leadingBlanks }, () => null);
  const monthKeys: string[] = [];

  for (let index = 0; index < YEAR_DAYS; index += 1) {
    const dateKey = addUtcDays(firstDateKey, index);
    const monthKey = dateKey.slice(0, 7);
    if (monthKeys[monthKeys.length - 1] !== monthKey) {
      monthKeys.push(monthKey);
    }
    cells.push(byDate.get(dateKey) ?? emptyActivity365Day(dateKey));
  }

  while (cells.length < YEAR_GRID_CELLS) cells.push(null);

  return {
    cells: cells.slice(0, YEAR_GRID_CELLS),
    monthKeys,
    todayKey,
  };
}

function monthComparisonSummary(
  days: readonly Activity365Day[],
  monthKey: string | null,
): MonthComparisonSummary {
  return days.reduce<MonthComparisonSummary>((summary, day) => {
    if (!monthKey || day.future || !day.date.startsWith(monthKey)) return summary;
    return {
      activeDays: summary.activeDays + (day.active ? 1 : 0),
      xp: summary.xp + Math.max(0, day.xp),
      minutes: summary.minutes + Math.max(0, day.minutes),
    };
  }, { activeDays: 0, xp: 0, minutes: 0 });
}

function heatPalette(theme: any, themeMode: string): readonly string[] {
  if (themeMode === 'gold') {
    return ['#29241D', '#6D5529', '#A77B35', '#D4A954', '#F6D98A'];
  }
  return [
    theme.bgSurface2,
    withAlpha(theme.accent, 0.22),
    withAlpha(theme.accent, 0.42),
    withAlpha(theme.accent, 0.7),
    theme.accent,
  ];
}

function CanonicalYearHeatmap({
  model,
  statusText,
  onOpenMonth,
}: {
  model: CanonicalYearModel;
  statusText: string | null;
  onOpenMonth: (monthKey: string) => void;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const { width } = useWindowDimensions();
  const palette = heatPalette(t, themeMode);
  const activityMapSurface = themeMode === 'gold'
    ? ['#211D17', '#15120E']
    : [withAlpha(t.bgSurface2, 0.98), withAlpha(t.bgCard, 0.94)];
  const activityNudgeSurface = themeMode === 'gold'
    ? ['#29241D', '#1C1812']
    : [withAlpha(t.accent, 0.12), withAlpha(t.bgSurface2, 0.94)];
  const usableWidth = Math.max(260, width - 64);
  const cellSize = Math.max(
    4,
    Math.floor((usableWidth - (YEAR_GRID_COLS - 1) * YEAR_CELL_GAP) / YEAR_GRID_COLS),
  );
  const gridWidth = YEAR_GRID_COLS * cellSize + (YEAR_GRID_COLS - 1) * YEAR_CELL_GAP;
  const gridHeight = YEAR_GRID_ROWS * cellSize + (YEAR_GRID_ROWS - 1) * YEAR_CELL_GAP;

  return (
    <View testID="activity-365-full-year">
      <View style={[styles.yearMapSurface, { backgroundColor: activityMapSurface[0] }]}>
      <View
        style={{
          width: gridWidth,
          height: gridHeight,
          flexDirection: 'column',
          flexWrap: 'wrap',
          gap: YEAR_CELL_GAP,
        }}
      >
        {model.cells.map((day, index) => (
          <TouchableOpacity
            key={day?.date ?? `empty-${index}`}
            accessibilityRole="button"
            accessibilityLabel={day?.date}
            activeOpacity={0.76}
            disabled={!day}
            onPress={() => day && onOpenMonth(day.date.slice(0, 7))}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: Math.max(1, Math.floor(cellSize / 3)),
              backgroundColor: day ? palette[day.level] : 'transparent',
            }}
          />
        ))}
      </View>
      </View>
      {statusText ? (
        /* colors={activityNudgeSurface}: saved/loading state is distinct without becoming another card. */
        <View style={[styles.yearNudgeSurface, { backgroundColor: activityNudgeSurface[0] }]}>
        <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
          {statusText}
        </Text>
        </View>
      ) : null}
    </View>
  );
}

function CompactHistoryHeatmap({
  days,
  statusText,
  onOpenMonth,
}: {
  days: readonly Activity365Day[];
  statusText: string | null;
  onOpenMonth: (monthKey: string) => void;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { width } = useWindowDimensions();
  const palette = heatPalette(t, themeMode);
  const observedDays = days.filter((day) => !day.future);
  const columns = 7;
  const gap = 5;
  const usableWidth = Math.max(220, width - 64);
  const cellSize = Math.max(22, Math.floor((usableWidth - (columns - 1) * gap) / columns));
  const historyLabel = copy(lang, {
    ru: `${observedDays.length} из 365 дней`,
    uk: `${observedDays.length} із 365 днів`,
    es: `${observedDays.length} de 365 días`,
    'pt-BR': `${observedDays.length} de 365 dias`,
    vi: `${observedDays.length} trong 365 ngày`,
    id: `${observedDays.length} dari 365 hari`,
    tr: `365 günün ${observedDays.length} günü`,
    pl: `${observedDays.length} z 365 dni`,
    en: `${observedDays.length} of 365 days`,
  });

  return (
    <View testID="activity-history-since-start">
      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginBottom: 9 }}>
        {historyLabel}
      </Text>
      <View style={[styles.compactHistorySurface, { backgroundColor: withAlpha(t.bgSurface2, 0.98) }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {observedDays.map((day) => (
            <TouchableOpacity
              key={day.date}
              testID={`activity-history-day-${day.date}`}
              accessibilityRole="button"
              accessibilityLabel={formatSelectedDay(day.date, lang)}
              activeOpacity={0.76}
              onPress={() => onOpenMonth(day.date.slice(0, 7))}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: Math.max(4, Math.floor(cellSize / 3)),
                backgroundColor: palette[day.level],
              }}
            />
          ))}
        </View>
      </View>
      {statusText ? (
        <View style={[styles.yearNudgeSurface, { backgroundColor: withAlpha(t.accent, 0.12) }]}>
          <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{statusText}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MonthSelector({
  monthKey,
  lang,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  monthKey: string | null;
  lang: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { theme: t, f } = useTheme();
  return (
    <View style={styles.monthSelector}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Предыдущий месяц"
        disabled={!canPrevious}
        onPress={onPrevious}
        style={[styles.iconButton, { opacity: canPrevious ? 1 : 0.28 }]}
      >
        <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
      </TouchableOpacity>
      <Text
        style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}
        numberOfLines={1}
      >
        {monthKey ? formatMonth(monthKey, lang, true) : '—'}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Следующий месяц"
        disabled={!canNext}
        onPress={onNext}
        style={[styles.iconButton, { opacity: canNext ? 1 : 0.28 }]}
      >
        <Ionicons name="chevron-forward" size={20} color={t.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function MonthExplorerModal({
  days,
  monthKeys,
  monthKey,
  visible,
  onMonthChange,
  onClose,
}: {
  days: readonly Activity365Day[];
  monthKeys: readonly string[];
  monthKey: string | null;
  visible: boolean;
  onMonthChange: (monthKey: string) => void;
  onClose: () => void;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { width } = useWindowDimensions();
  const [selectedDay, setSelectedDay] = useState<Activity365Day | null>(null);
  const [monthAKey, setMonthAKey] = useState<string | null>(null);
  const [monthBKey, setMonthBKey] = useState<string | null>(null);
  const palette = heatPalette(t, themeMode);
  const currentIndex = monthKey ? monthKeys.indexOf(monthKey) : -1;
  const latestMonth = monthKeys[monthKeys.length - 1] ?? null;
  const previousMonth = monthKeys[Math.max(0, monthKeys.length - 2)] ?? latestMonth;
  const resolvedMonthA = monthAKey && monthKeys.includes(monthAKey) ? monthAKey : latestMonth;
  const resolvedMonthB = monthBKey && monthKeys.includes(monthBKey) ? monthBKey : previousMonth;
  const summaryA = useMemo(
    () => monthComparisonSummary(days, resolvedMonthA),
    [days, resolvedMonthA],
  );
  const summaryB = useMemo(
    () => monthComparisonSummary(days, resolvedMonthB),
    [days, resolvedMonthB],
  );
  const monthGrid = useMemo(
    () => activity365MonthGridCells(days, monthKey),
    [days, monthKey],
  );
  const daySize = Math.max(
    32,
    Math.floor((width - 32 - 24 - (6 * MONTH_CELL_GAP)) / 7),
  );

  useEffect(() => {
    setSelectedDay(null);
  }, [monthKey, visible]);

  const shiftComparisonMonth = (
    current: string | null,
    delta: -1 | 1,
    setValue: (value: string | null) => void,
  ) => {
    const index = current ? monthKeys.indexOf(current) : -1;
    const nextIndex = Math.max(0, Math.min(monthKeys.length - 1, index + delta));
    setValue(monthKeys[nextIndex] ?? current);
  };

  const weekdayLabels = copy(lang, {
    ru: 'Пн Вт Ср Чт Пт Сб Вс',
    uk: 'Пн Вт Ср Чт Пт Сб Нд',
    es: 'Lu Ma Mi Ju Vi Sá Do',
    'pt-BR': 'Se Te Qu Qu Se Sá Do',
    vi: 'T2 T3 T4 T5 T6 T7 CN',
    id: 'Sn Sl Rb Km Jm Sb Mg',
    tr: 'Pt Sa Ça Pe Cu Ct Pa',
    pl: 'Pn Wt Śr Cz Pt So Nd',
    en: 'Mo Tu We Th Fr Sa Su',
  }).split(' ');

  return (
    <Modal
      testID="activity-365-month-modal"
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.modal, { backgroundColor: t.bgPrimary }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Предыдущий месяц"
            disabled={currentIndex <= 0}
            onPress={() => currentIndex > 0 && onMonthChange(monthKeys[currentIndex - 1]!)}
            style={[styles.iconButton, { opacity: currentIndex > 0 ? 1 : 0.28 }]}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}
            numberOfLines={1}
          >
            {monthKey ? formatMonth(monthKey, lang, true) : ''}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Следующий месяц"
            disabled={currentIndex < 0 || currentIndex >= monthKeys.length - 1}
            onPress={() => currentIndex >= 0 && currentIndex < monthKeys.length - 1 && onMonthChange(monthKeys[currentIndex + 1]!)}
            style={[styles.iconButton, { opacity: currentIndex >= 0 && currentIndex < monthKeys.length - 1 ? 1 : 0.28 }]}
          >
            <Ionicons name="chevron-forward" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy(lang, { ru: 'Закрыть', en: 'Close' })}
            onPress={onClose}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={24} color={t.textPrimary} />
          </TouchableOpacity>
        </View>

        <View
          testID="activity-365-month-calendar"
          style={[styles.entity, { backgroundColor: t.bgSurface }]}
        >
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label) => (
              <Text
                key={label}
                style={{
                  width: daySize,
                  color: t.textMuted,
                  fontSize: f.sub,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.monthGrid}>
            {monthGrid.cells.map((cell, index) => {
              if (!cell.day) {
                return <View key={`empty-${index}`} style={{ width: daySize, height: daySize }} />;
              }
              const isSelected = selectedDay?.date === cell.day.date;
              const foreground = cell.day.level >= 3 ? t.correctText : t.textPrimary;
              return (
                <TouchableOpacity
                  key={cell.day.date}
                  testID={`activity-365-day-${cell.day.date}`}
                  accessibilityRole="button"
                  accessibilityLabel={cell.day.date}
                  disabled={cell.day.future}
                  activeOpacity={0.78}
                  onPress={() => setSelectedDay(cell.day)}
                  style={{
                    width: daySize,
                    height: daySize,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette[cell.day.level],
                    opacity: cell.day.future ? 0.25 : 1,
                    transform: [{ scale: isSelected ? 0.9 : 1 }],
                  }}
                >
                  <Text style={{ color: foreground, fontSize: f.body, fontWeight: '800' }}>
                    {Number(cell.day.date.slice(8))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDay ? (
            <Text
              testID="activity-365-selected-day"
              style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 14 }}
            >
              {formatSelectedDay(selectedDay.date, lang)} · {selectedDay.xp} XP · {selectedDay.minutes} мин
            </Text>
          ) : null}
        </View>

        <View
          testID="activity-365-month-comparison"
          style={[styles.entity, { backgroundColor: t.bgSurface2 }]}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginBottom: 10 }}>
            {copy(lang, {
              ru: 'Сравнение месяцев',
              uk: 'Порівняння місяців',
              es: 'Comparar meses',
              'pt-BR': 'Comparar meses',
              vi: 'So sánh tháng',
              id: 'Bandingkan bulan',
              tr: 'Ayları karşılaştır',
              pl: 'Porównaj miesiące',
              en: 'Compare months',
            })}
          </Text>
          <View style={styles.comparisonSelectors}>
            <MonthSelector
              monthKey={resolvedMonthA}
              lang={lang}
              canPrevious={!!resolvedMonthA && monthKeys.indexOf(resolvedMonthA) > 0}
              canNext={!!resolvedMonthA && monthKeys.indexOf(resolvedMonthA) < monthKeys.length - 1}
              onPrevious={() => shiftComparisonMonth(resolvedMonthA, -1, setMonthAKey)}
              onNext={() => shiftComparisonMonth(resolvedMonthA, 1, setMonthAKey)}
            />
            <MonthSelector
              monthKey={resolvedMonthB}
              lang={lang}
              canPrevious={!!resolvedMonthB && monthKeys.indexOf(resolvedMonthB) > 0}
              canNext={!!resolvedMonthB && monthKeys.indexOf(resolvedMonthB) < monthKeys.length - 1}
              onPrevious={() => shiftComparisonMonth(resolvedMonthB, -1, setMonthBKey)}
              onNext={() => shiftComparisonMonth(resolvedMonthB, 1, setMonthBKey)}
            />
          </View>
          {[
            {
              label: copy(lang, { ru: 'Дни', uk: 'Дні', es: 'Días', 'pt-BR': 'Dias', vi: 'Ngày', id: 'Hari', tr: 'Gün', pl: 'Dni', en: 'Days' }),
              left: summaryA.activeDays,
              right: summaryB.activeDays,
            },
            { label: 'XP', left: summaryA.xp, right: summaryB.xp },
            {
              label: copy(lang, { ru: 'Время', uk: 'Час', es: 'Tiempo', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas', en: 'Time' }),
              left: `${summaryA.minutes} мин`,
              right: `${summaryB.minutes} мин`,
            },
          ].map((row) => (
            <View key={row.label} style={styles.comparisonRow}>
              <Text style={{ flex: 1, color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                {row.label}
              </Text>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'center' }}>
                {row.left}
              </Text>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800', textAlign: 'right' }}>
                {row.right}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function ActivityHeatmap365() {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const initialSnapshot = peekActivity365Analytics(studyTarget);
  const [loadState, setLoadState] = useState<{
    target: string;
    analytics: Activity365Analytics | null;
    status: LoadStatus;
    stale: boolean;
  }>(() => ({
    target: studyTarget,
    analytics: initialSnapshot?.analytics ?? null,
    status: initialSnapshot ? 'ready' : 'loading',
    stale: initialSnapshot?.stale ?? false,
  }));
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  const currentSnapshot = loadState.target === studyTarget
    ? loadState
    : (() => {
      const snapshot = peekActivity365Analytics(studyTarget);
      return {
        target: studyTarget,
        analytics: snapshot?.analytics ?? null,
        status: (snapshot ? 'ready' : 'loading') as LoadStatus,
        stale: snapshot?.stale ?? false,
      };
    })();

  useEffect(() => {
    let cancelled = false;
    const snapshot = peekActivity365Analytics(studyTarget);
    setLoadState({
      target: studyTarget,
      analytics: snapshot?.analytics ?? null,
      status: snapshot ? 'ready' : 'loading',
      stale: snapshot?.stale ?? false,
    });
    void loadActivity365Analytics(studyTarget)
      .then((analytics) => {
        if (!cancelled) {
          setLoadState({ target: studyTarget, analytics, status: 'ready', stale: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState((current) => current.target === studyTarget && current.analytics
            ? { ...current, status: 'ready', stale: true }
            : { target: studyTarget, analytics: null, status: 'error', stale: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [studyTarget]);

  useEffect(() => {
    setSelectedMonthKey(null);
  }, [studyTarget]);

  const days = currentSnapshot.analytics?.days ?? [];
  const yearModel = useMemo(() => buildCanonicalYear(days), [days]);
  const hasActivity = days.some((day) => day.active && !day.future);
  const statusText = currentSnapshot.status === 'error'
    ? copy(lang, { ru: 'Данные недоступны', en: 'Data unavailable' })
    : currentSnapshot.status === 'loading'
      ? copy(lang, { ru: 'Загружаем данные', en: 'Loading data' })
      : currentSnapshot.stale
        ? copy(lang, { ru: 'Последние сохранённые данные', en: 'Last saved data' })
        : !hasActivity
          ? copy(lang, { ru: 'Пока нет данных', en: 'No data yet' })
          : null;

  return (
    <View testID="stats-activity-365">
      <CanonicalYearHeatmap
        model={yearModel}
        statusText={statusText}
        onOpenMonth={setSelectedMonthKey}
      />
      <MonthExplorerModal
        days={days}
        monthKeys={yearModel.monthKeys}
        monthKey={selectedMonthKey}
        visible={selectedMonthKey !== null}
        onMonthChange={setSelectedMonthKey}
        onClose={() => setSelectedMonthKey(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  yearMapSurface: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    padding: 8,
  },
  yearNudgeSurface: {
    alignSelf: 'stretch',
    borderRadius: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  modal: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 52,
    gap: 14,
  },
  modalHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entity: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 0,
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: MONTH_CELL_GAP,
    marginBottom: 6,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MONTH_CELL_GAP,
  },
  comparisonSelectors: {
    flexDirection: 'row',
    gap: 10,
  },
  monthSelector: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default memo(ActivityHeatmap365);

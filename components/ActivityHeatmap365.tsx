import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import {
  activity365MonthGridCells,
  emptyActivity365Day,
  latestObservedActivity365Date,
  loadActivity365Analytics,
  peekActivity365Analytics,
  type Activity365Analytics,
  type Activity365Day,
} from '../app/activity_365_analytics';
import { GOLD_RICH } from '../constants/goldTheme';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import type { ThemeMode } from '../constants/theme';
import { LinearGradient } from './SafeLinearGradient';
import { FlowText } from './text-integrity/FlowText';
import { useLang } from './LangContext';
import { useStudyTarget } from './StudyTargetContext';
import { useTheme } from './ThemeContext';
import { accentGraphicOf } from '../constants/themeAccentRoles';
import BackGlyph from './v2/BackGlyph';

const EXEMPT_COLOR_1 = '#211D17'; // theme-exempt: тёмные стопки градиента тепловой карты — палитра графика (токены графиков — у «Тем»)
const EXEMPT_COLOR_2 = '#15120E'; // theme-exempt: тёмные стопки градиента тепловой карты — палитра графика (токены графиков — у «Тем»)
const EXEMPT_COLOR_3 = '#29241D'; // theme-exempt: тёмные стопки градиента тепловой карты — палитра графика (токены графиков — у «Тем»)
const EXEMPT_COLOR_4 = '#1C1812'; // theme-exempt: тёмные стопки градиента тепловой карты — палитра графика (токены графиков — у «Тем»)

const YEAR_DAYS = 365;
const YEAR_GRID_ROWS = 7;
const YEAR_GRID_COLS = 53;
const YEAR_GRID_CELLS = YEAR_GRID_ROWS * YEAR_GRID_COLS;
const YEAR_CELL_GAP = 1;
// `.om-calendar`: промежуток 6 между клетками месяца.
const MONTH_CELL_GAP = 6;

type LoadStatus = 'loading' | 'ready' | 'error';
type MonthComparisonSummary = { activeDays: number; minutes: number };
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
    en: 'en-US',
    es: 'es-ES',
    'pt-BR': 'pt-BR',
    vi: 'vi-VN',
    id: 'id-ID',
    tr: 'tr-TR',
    pl: 'pl-PL',
  };
  return locales[lang] ?? 'en-US';
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

export function buildCanonicalYear(days: readonly Activity365Day[]): CanonicalYearModel {
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
      minutes: summary.minutes + Math.max(0, day.minutes),
    };
  }, { activeDays: 0, minutes: 0 });
}

// зачем (координатор 12.10, R1_THEMEMODE_LEGACY_MAP): акцент тепловой карты — акцент ТЕМЫ (theme.accent), а не statsThemeAccent(themeMode):
// themeMode в приложении всегда 'dark', и карта была зелёной на любой теме и в светлом оформлении.
export function heatPalette(themeMode: ThemeMode, themeAccent: string): readonly string[] {
  // BUG 2: palette[0] (пустые дни) обязан быть виден на фоне поверхности —
  // раньше он совпадал с цветом фона, и годовая сетка выглядела «пустой».
  // BUG 4: вся рампа — от главного акцента темы (единый hue), gold — из GOLD_RICH.
  if (themeMode === 'gold') {
    return [GOLD_RICH.bronzeWashStrong, GOLD_RICH.agedGold, GOLD_RICH.antiqueGold, GOLD_RICH.metalGold, GOLD_RICH.champagne];
  }
  const accent = themeAccent;
  return [
    withAlpha(accent, 0.1),
    withAlpha(accent, 0.28),
    withAlpha(accent, 0.5),
    withAlpha(accent, 0.75),
    accent,
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
  const palette = useMemo(() => heatPalette(themeMode, accentGraphicOf(t)), [themeMode, t]); // зачем: рампа пересчитывается только при смене темы, не на каждом рендере годовой сетки
  const activityMapSurface = themeMode === 'gold'
    ? [EXEMPT_COLOR_1, EXEMPT_COLOR_2]
    : [withAlpha(t.bgSurface2, 0.98), withAlpha(t.bgCard, 0.94)];
  const activityNudgeSurface = themeMode === 'gold'
    ? [EXEMPT_COLOR_3, EXEMPT_COLOR_4]
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
  const palette = useMemo(() => heatPalette(themeMode, accentGraphicOf(t)), [themeMode, t]); // зачем: рампа пересчитывается только при смене темы, не на каждом рендере годовой сетки
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

// зачем (overlays-more `.om-compare-nav`): месяц сравнения — кнопки 24, шеврон 16, название по центру.
function MonthSelector({
  monthKey,
  lang,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  color,
}: {
  monthKey: string | null;
  lang: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  color: string;
}) {
  return (
    <View style={styles.monthSelector}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={copy(lang, { ru: 'Предыдущий месяц', uk: 'Попередній місяць', es: 'Mes anterior', 'pt-BR': 'Mês anterior', vi: 'Tháng trước', id: 'Bulan sebelumnya', tr: 'Önceki ay', pl: 'Poprzedni miesiąc', en: 'Previous month' })}
        disabled={!canPrevious}
        onPress={onPrevious}
        hitSlop={10}
        style={[styles.compareNavButton, { opacity: canPrevious ? 1 : 0.42 }]}
      >
        <BackGlyph size={16} color={color} />
      </TouchableOpacity>
      <FlowText
        testID="activity-365-month-selector-label"
        provenance="authored"
        style={{ flex: 1, color, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' }}
      >
        {monthKey ? formatMonthName(monthKey, lang, false) : '—'}
      </FlowText>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={copy(lang, { ru: 'Следующий месяц', uk: 'Наступний місяць', es: 'Mes siguiente', 'pt-BR': 'Próximo mês', vi: 'Tháng sau', id: 'Bulan berikutnya', tr: 'Sonraki ay', pl: 'Następny miesiąc', en: 'Next month' })}
        disabled={!canNext}
        onPress={onNext}
        hitSlop={10}
        style={[styles.compareNavButton, { opacity: canNext ? 1 : 0.42 }]}
      >
        <Ionicons name="chevron-forward" size={16} color={color} />
      </TouchableOpacity>
    </View>
  );
}

// зачем (OM-MONTH-*): заголовок «Сентябрь 2026» и «Сентябрь» в карточке — полное имя месяца с заглавной.
function formatMonthName(monthKey: string, lang: string, withYear: boolean): string {
  const [year, month] = monthKey.split('-').map(Number) as [number, number];
  const text = new Intl.DateTimeFormat(localeForLang(lang), {
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return text.charAt(0).toLocaleUpperCase(localeForLang(lang)) + text.slice(1);
}

type CountForms = { one: string; few?: string; many?: string; other: string };

// зачем (Сверка results-009 🔴, 05.10): тап «Год» → красный экран «Cannot read property 'prototype' of undefined»
// рядом с MonthSelector; сразу под ним карточка месяца зовёт countLabel → Intl.PluralRules, которого в Hermes на
// Android нет (см. FlashcardsHubScreen.packsWord). Логи [HEATMAP-PLURAL] показывают факт: что лежит в
// Intl.PluralRules и чем упал конструктор; вместо падения — ручные формы ru/uk/pl, остальные «один / другие».
type PluralCat = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
let pluralFallbackLogged = false;
function manualPluralCategory(lang: string, n: number): PluralCat {
  const abs = Math.abs(Math.trunc(n));
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (lang === 'ru' || lang === 'uk') {
    if (n10 === 1 && n100 !== 11) return 'one';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'few';
    return 'many';
  }
  if (lang === 'pl') {
    if (abs === 1) return 'one';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'few';
    return 'many';
  }
  return abs === 1 ? 'one' : 'other';
}
function pluralCategory(lang: string, count: number): PluralCat {
  const ctorType = typeof (globalThis as { Intl?: { PluralRules?: unknown } }).Intl?.PluralRules;
  if (ctorType !== 'function') {
    if (!pluralFallbackLogged) {
      pluralFallbackLogged = true;
      console.warn(`[HEATMAP-PLURAL] fallback reason=no_ctor typeof=${ctorType} lang=${lang} count=${count}`); // guard-ok: однократный лог причины (флаг), правило «сперва логи»
    }
    return manualPluralCategory(lang, count);
  }
  try {
    return new Intl.PluralRules(localeForLang(lang)).select(count);
  } catch (error) {
    if (!pluralFallbackLogged) {
      pluralFallbackLogged = true;
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn(`[HEATMAP-PLURAL] fallback reason=ctor_threw lang=${lang} count=${count} message=${err.message} stack=${(err.stack ?? '').split('\n').slice(0, 4).join(' | ')}`); // guard-ok: однократный лог причины (флаг), правило «сперва логи»
    }
    return manualPluralCategory(lang, count);
  }
}

// зачем: «12 дней», «24 минуты практики» — склонение по правилам языка, а не «мин» на всё.
function countLabel(lang: string, count: number, forms: Record<string, CountForms>): string {
  const set = forms[lang] ?? forms.en!;
  const rule = pluralCategory(lang, count);
  const word = (rule === 'one' ? set.one : rule === 'few' ? set.few : rule === 'many' ? set.many : undefined) ?? set.other;
  return `${count} ${word}`;
}

const DAY_FORMS: Record<string, CountForms> = {
  ru: { one: 'день', few: 'дня', many: 'дней', other: 'дня' },
  uk: { one: 'день', few: 'дні', many: 'днів', other: 'дня' },
  pl: { one: 'dzień', few: 'dni', many: 'dni', other: 'dnia' },
  es: { one: 'día', other: 'días' },
  'pt-BR': { one: 'dia', other: 'dias' },
  vi: { one: 'ngày', other: 'ngày' },
  id: { one: 'hari', other: 'hari' },
  tr: { one: 'gün', other: 'gün' },
  en: { one: 'day', other: 'days' },
};

const PRACTICE_MINUTE_FORMS: Record<string, CountForms> = {
  ru: { one: 'минута практики', few: 'минуты практики', many: 'минут практики', other: 'минуты практики' },
  uk: { one: 'хвилина практики', few: 'хвилини практики', many: 'хвилин практики', other: 'хвилини практики' },
  pl: { one: 'minuta ćwiczeń', few: 'minuty ćwiczeń', many: 'minut ćwiczeń', other: 'minuty ćwiczeń' },
  es: { one: 'minuto de práctica', other: 'minutos de práctica' },
  'pt-BR': { one: 'minuto de prática', other: 'minutos de prática' },
  vi: { one: 'phút luyện tập', other: 'phút luyện tập' },
  id: { one: 'menit latihan', other: 'menit latihan' },
  tr: { one: 'dakika pratik', other: 'dakika pratik' },
  en: { one: 'minute of practice', other: 'minutes of practice' },
};

export function MonthExplorerModal({
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
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const { width } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const monthGlass = liquidGlassTokens(liquidGlassThemeId);
  const [selectedDay, setSelectedDay] = useState<Activity365Day | null>(null);
  const [monthAKey, setMonthAKey] = useState<string | null>(null);
  const [monthBKey, setMonthBKey] = useState<string | null>(null);
  // зачем (overlays-more `.om-day`): нейтральная графитовая клетка; день с практикой светлеет
  // по уровню, самый активный — светлая плашка `.om-day.active` с тёмной цифрой.
  const palette = useMemo(
    () => [
      monthGlass.opaqueControl,
      withAlpha(monthGlass.text, 0.4),
      withAlpha(monthGlass.text, 0.6),
      withAlpha(monthGlass.text, 0.8),
      monthGlass.text,
    ],
    [monthGlass.opaqueControl, monthGlass.text],
  );
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
  // `.om-full` поля 18 + сетка в 7 колонок с промежутком 6.
  const daySize = Math.max(
    32,
    Math.floor((width - 36 - (6 * MONTH_CELL_GAP)) / 7),
  );
  const minutesShort = copy(lang, { ru: 'мин', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min', en: 'min' });

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

  const comparisonCards = [
    {
      key: 'a',
      monthKey: resolvedMonthA,
      summary: summaryA,
      setValue: setMonthAKey,
    },
    {
      key: 'b',
      monthKey: resolvedMonthB,
      summary: summaryB,
      setValue: setMonthBKey,
    },
  ];

  return (
    <Modal
      testID="activity-365-month-modal"
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modal,
          { backgroundColor: t.bgPrimary, paddingTop: Math.max(52, insets.top + 16) },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[monthGlass.bgTop, monthGlass.bgBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* `.om-month-head`: 40 · месяц 16 · 40 · 40, голые кнопки, значки 20 */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy(lang, { ru: 'Предыдущий месяц', uk: 'Попередній місяць', es: 'Mes anterior', 'pt-BR': 'Mês anterior', vi: 'Tháng trước', id: 'Bulan sebelumnya', tr: 'Önceki ay', pl: 'Poprzedni miesiąc', en: 'Previous month' })}
            disabled={currentIndex <= 0}
            onPress={() => currentIndex > 0 && onMonthChange(monthKeys[currentIndex - 1]!)}
            style={[styles.iconButton, { opacity: currentIndex > 0 ? 1 : 0.28 }]}
          >
            <BackGlyph size={20} color={monthGlass.text} />
          </TouchableOpacity>
          <FlowText
            testID="activity-365-month-modal-title"
            provenance="authored"
            style={{ flex: 1, color: monthGlass.text, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' }}
          >
            {monthKey ? formatMonthName(monthKey, lang, true) : ''}
          </FlowText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy(lang, { ru: 'Следующий месяц', uk: 'Наступний місяць', es: 'Mes siguiente', 'pt-BR': 'Próximo mês', vi: 'Tháng sau', id: 'Bulan berikutnya', tr: 'Sonraki ay', pl: 'Następny miesiąc', en: 'Next month' })}
            disabled={currentIndex < 0 || currentIndex >= monthKeys.length - 1}
            onPress={() => currentIndex >= 0 && currentIndex < monthKeys.length - 1 && onMonthChange(monthKeys[currentIndex + 1]!)}
            style={[styles.iconButton, { opacity: currentIndex >= 0 && currentIndex < monthKeys.length - 1 ? 1 : 0.28 }]}
          >
            <Ionicons name="chevron-forward" size={20} color={monthGlass.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij', en: 'Close' })}
            onPress={onClose}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={20} color={monthGlass.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          testID="activity-365-month-viewport"
          style={styles.monthViewport}
          contentContainerStyle={[
            styles.monthViewportContent,
            { paddingBottom: Math.max(28, insets.bottom + 16) },
          ]}
          showsVerticalScrollIndicator decelerationRate="fast"
        >
          {/* `.om-month-calendar`: секция без карточки — сетка дней прямо на фоне */}
          <View testID="activity-365-month-calendar" style={styles.monthSection}>
            <View style={styles.weekdayRow}>
              {weekdayLabels.map((label) => (
                <Text
                  key={label}
                  style={{ width: daySize, color: monthGlass.mutedText, fontSize: 13, lineHeight: 17, textAlign: 'center' }}
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
                const foreground = cell.day.level >= 3 ? monthGlass.opaqueSheet : monthGlass.secondary;
                return (
                  <TouchableOpacity
                    key={cell.day.date}
                    testID={`activity-365-day-${cell.day.date}`}
                    accessibilityRole="button"
                    accessibilityLabel={cell.day.date}
                    accessibilityState={{ selected: isSelected, disabled: cell.day.future }}
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
                      opacity: cell.day.future ? 0.28 : 1,
                    }}
                  >
                    {isSelected ? (
                      // `.om-day.selected`: кольцо 2 с отступом 2 — признак выбранного дня, не обводка блока.
                      <View
                        pointerEvents="none"
                        style={[styles.selectedRing, { borderColor: monthGlass.text }]} // guard-ok: кольцо выбранного дня из макета
                      />
                    ) : null}
                    <Text style={{ color: foreground, fontSize: 13, fontWeight: '700' }}>
                      {Number(cell.day.date.slice(8))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedDay ? (
              // `.om-info`: плашка дня — дата и минуты практики.
              <View
                testID="activity-365-selected-day"
                style={[styles.dayInfo, { backgroundColor: monthGlass.opaqueControl }]}
              >
                <Text style={{ color: monthGlass.text, fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 4 }}>
                  {formatSelectedDay(selectedDay.date, lang)}
                </Text>
                <Text style={{ color: monthGlass.secondary, fontSize: 13, lineHeight: 19 }}>
                  {countLabel(lang, selectedDay.minutes, PRACTICE_MINUTE_FORMS)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* `.om-month-comparison`: заголовок 25/31 слева и две карточки месяцев */}
          <View testID="activity-365-month-comparison" style={styles.comparisonSection}>
            <Text style={{ color: monthGlass.text, fontSize: 25, lineHeight: 31, fontWeight: '800' }}>
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
            <View style={styles.comparisonCards}>
              {comparisonCards.map((card) => (
                <View
                  key={card.key}
                  testID={`activity-365-month-compare-${card.key}`}
                  style={[styles.compareCard, { backgroundColor: monthGlass.opaqueControl }]}
                >
                  <MonthSelector
                    monthKey={card.monthKey}
                    lang={lang}
                    color={monthGlass.text}
                    canPrevious={!!card.monthKey && monthKeys.indexOf(card.monthKey) > 0}
                    canNext={!!card.monthKey && monthKeys.indexOf(card.monthKey) < monthKeys.length - 1}
                    onPrevious={() => shiftComparisonMonth(card.monthKey, -1, card.setValue)}
                    onNext={() => shiftComparisonMonth(card.monthKey, 1, card.setValue)}
                  />
                  <Text style={[styles.compareValue, { color: monthGlass.secondary }]}>
                    {countLabel(lang, card.summary.activeDays, DAY_FORMS)}
                  </Text>
                  <Text style={[styles.compareValue, { color: monthGlass.secondary }]}>
                    {`${card.summary.minutes} ${minutesShort}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
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
  const router = useRouter();

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
      .catch((error) => {
        console.warn('[HEATMAP365] загрузка аналитики не удалась, остаёмся на локальных данных', error instanceof Error ? error.message : String(error));
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

  const days = currentSnapshot.analytics?.days ?? [];
  const yearModel = useMemo(() => buildCanonicalYear(days), [days]);
  const hasActivity = days.some((day) => day.active && !day.future);
  // зачем (владелец 01.10): никаких «Загружаем/Данные недоступны/Пока нет данных» —
  // сетка рисуется сразу из локальных данных, пустые дни — просто пустые клетки.
  const statusText: string | null = null;

  return (
    <View testID="stats-activity-365">
      {/* зачем (владелец 13.10, вопрос 17; results-009): тап по полоске «Год» открывает отдельный экран «Активность за год» (окно месяца теперь на нём); данные те же, из кэша. */}
      <CanonicalYearHeatmap
        model={yearModel}
        statusText={statusText}
        onOpenMonth={() => {
          console.log(`[YEAR-ACTIVITY] тап по полоске → /year_activity (studyTarget=${studyTarget}, дней в кэше=${days.length})`); // guard-ok: действие пользователя
          router.push('/year_activity' as never);
        }}
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
  compactHistorySurface: {
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
  // `.om-full`: поля 18 по бокам.
  modal: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 52,
    gap: 4,
  },
  modalHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthViewport: {
    flex: 1,
    minHeight: 0,
  },
  monthViewportContent: {
    paddingBottom: 28,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSection: {
    paddingTop: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: MONTH_CELL_GAP,
    marginTop: 13,
    marginBottom: MONTH_CELL_GAP,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MONTH_CELL_GAP,
  },
  selectedRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 13,
    borderWidth: 2, // shadow-ok: кольцо выбранного дня календаря — состояние выбора, не контейнер
  },
  // `.om-info`
  dayInfo: {
    marginTop: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  comparisonSection: {
    marginTop: 18,
    paddingTop: 8,
  },
  // `.om-compare` / `.om-compare-card`
  comparisonCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  compareCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 15,
  },
  compareNavButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareValue: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default memo(ActivityHeatmap365);

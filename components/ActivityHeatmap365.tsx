/**
 * Годовая карта активности: ровно 365 календарных дня подряд (к старым — слева / выше при переносе),
 * без привязки к неделям и без подписей дней.
 * Данные: опыт из daily_stats и время в приложении (foreground).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import type { Theme } from '../constants/theme';
import { getForegroundDailyMsMap } from '../app/foreground_usage_ms';

const WINDOW_DAYS = 365;
const MIN_ACTIVE_MS = 60_000;
const CELL_GAP = 1.25;

/** Жёсткий потолок по высоте сетки, чтобы блок целиком умещался на экране вместе с заголовком и легендой. */
function maxGridHeightForScreen(screenH: number): number {
  return Math.min(300, Math.max(140, Math.round(screenH * 0.36)));
}

/**
 * UTC-календарный ключ (YYYY-MM-DD), совместимый с hall_of_fame_utils / foreground_usage_ms.
 */
function utcCalendarKey(now: Date = new Date()): string {
  return now.toISOString().split('T')[0]!;
}

function addDaysUtcKey(dateKey: string, deltaDays: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split('T')[0]!;
}

function extractPoints(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (
    typeof val === 'object' &&
    val !== null &&
    'points' in val &&
    typeof (val as { points: unknown }).points === 'number'
  ) {
    return (val as { points: number }).points;
  }
  return 0;
}

function percentileThresholds(sorted: number[]): [number, number, number, number] {
  if (sorted.length === 0) return [1, 2, 3, 4];
  const pick = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];
  return [pick(0.33), pick(0.55), pick(0.77), pick(1)];
}

function levelForDay(xp: number, ms: number, thr: [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  const timeOk = ms >= MIN_ACTIVE_MS;
  if (xp <= 0 && !timeOk) return 0;
  if (xp <= 0) return 1;
  const [t1, t2, t3, t4] = thr;
  if (xp <= t1) return 1;
  if (xp <= t2) return 2;
  if (xp <= t3) return 3;
  return xp >= t4 ? 4 : 3;
}

/** Самая ранняя дата с опытом или заметным временем в приложении (в пределах окна у endStr). */
function findFirstActivityKey(
  statsMap: Record<string, unknown>,
  fgDaily: Record<string, number>,
  endStr: string,
): string | null {
  const limitStart = addDaysUtcKey(endStr, -800);
  let best: string | null = null;
  for (const [k, v] of Object.entries(statsMap)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (k < limitStart || k > endStr) continue;
    const xp = extractPoints(v);
    const ms = fgDaily[k] ?? 0;
    if (xp > 0 || ms >= MIN_ACTIVE_MS) {
      if (!best || k < best) best = k;
    }
  }
  for (const [k, ms] of Object.entries(fgDaily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (k < limitStart || k > endStr) continue;
    if (ms >= MIN_ACTIVE_MS) {
      if (!best || k < best) best = k;
    }
  }
  return best;
}

/** Сколько календарных дней от a до b включительно (a <= b), UTC-ключи. */
function inclusiveDaySpan(a: string, b: string): number {
  const t0 = new Date(`${a}T12:00:00Z`).getTime();
  const t1 = new Date(`${b}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((t1 - t0) / 86400000) + 1);
}

export type HeatmapDayCell = { date: string; level: 0 | 1 | 2 | 3 | 4 };

/** Подбор строк/столбцов: все count клеток вписываются в прямоугольник (ширина × maxH). */
function computePackedGrid(innerW: number, maxInnerH: number, gap: number, count: number): { cols: number; rows: number; cellSize: number } {
  if (innerW <= 4 || maxInnerH <= 4 || count < 1) return { cols: 19, rows: 20, cellSize: 6 };
  let best: { cols: number; rows: number; cellSize: number } = { cols: 1, rows: count, cellSize: 4 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const availW = innerW - (cols - 1) * gap;
    const availH = maxInnerH - (rows - 1) * gap;
    if (availW <= 0 || availH <= 0) continue;
    const fromW = availW / cols;
    const fromH = availH / rows;
    const s = Math.min(fromW, fromH);
    if (s <= 4) continue;
    if (s > best.cellSize || (Math.abs(s - best.cellSize) < 1e-6 && cols > best.cols)) {
      best = { cols, rows, cellSize: s };
    }
  }
  if (best.cellSize < 5) best = { ...best, cellSize: Math.max(4, Math.min(best.cellSize, innerW / best.cols)) };
  return best;
}

export function useActivityHeatmap365Data(): {
  days: HeatmapDayCell[];
  loading: boolean;
  reload: () => void;
} {
  const [days, setDays] = useState<HeatmapDayCell[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRaw, fgDaily] = await Promise.all([
        AsyncStorage.getItem('daily_stats'),
        getForegroundDailyMsMap(),
      ]);
      const statsMap: Record<string, unknown> = statsRaw ? JSON.parse(statsRaw) : {};

      const endStr = utcCalendarKey();
      const firstAct = findFirstActivityKey(statsMap, fgDaily, endStr);

      /** Начало 365 последовательных слотов по календарю: если с первой активности прошло больше года — режем «последние 365», иначе с первой активности (хвост за сегодня — серые «ещё не было» дней). */
      let timelineStart = addDaysUtcKey(endStr, -(WINDOW_DAYS - 1));
      if (firstAct != null) {
        const span = inclusiveDaySpan(firstAct, endStr);
        if (span <= WINDOW_DAYS) {
          timelineStart = firstAct;
        }
      }

      const xpsInWindow: number[] = [];
      for (let i = 0; i < WINDOW_DAYS; i++) {
        const ds = addDaysUtcKey(timelineStart, i);
        if (ds > endStr) break;
        const xp = extractPoints(statsMap[ds]);
        if (xp > 0) xpsInWindow.push(xp);
      }
      xpsInWindow.sort((a, b) => a - b);
      const thr = percentileThresholds(xpsInWindow);

      const out: HeatmapDayCell[] = [];
      for (let i = 0; i < WINDOW_DAYS; i++) {
        const ds = addDaysUtcKey(timelineStart, i);
        if (ds > endStr) {
          out.push({ date: ds, level: 0 });
          continue;
        }
        const xp = extractPoints(statsMap[ds]);
        const ms = fgDaily[ds] ?? 0;
        out.push({ date: ds, level: levelForDay(xp, ms, thr) });
      }
      setDays(out);
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void compute();
      return undefined;
    }, [compute]),
  );

  return { days, loading, reload: compute };
}

/** #RRGGBB из палитры темы (поле correct / bgSurface — всегда hex). */
function parseThemeHex(hex: string): { r: number; g: number; b: number } | null {
  const n = hex.trim().replace(/^#/, '');
  if (n.length !== 6) return null;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

function lerpRgb(
  bg: { r: number; g: number; b: number },
  fg: { r: number; g: number; b: number },
  k: number,
): string {
  const t = Math.max(0, Math.min(1, k));
  const r = Math.round(bg.r + (fg.r - bg.r) * t);
  const g = Math.round(bg.g + (fg.g - bg.g) * t);
  const b = Math.round(bg.b + (fg.b - bg.b) * t);
  return `rgb(${r},${g},${b})`;
}

/** Уровни интенсивности строго из цветов текущей темы (пустая ячейка — фон плитки). */
function heatmapPalette(t: Theme): { empty: string; l1: string; l2: string; l3: string; l4: string } {
  const bg = parseThemeHex(t.bgSurface2) ?? parseThemeHex(t.bgCard);
  const fg = parseThemeHex(t.correct) ?? parseThemeHex(t.accent);
  if (!bg || !fg) {
    return { empty: t.bgSurface2, l1: t.correctBg, l2: t.correct, l3: t.correct, l4: t.correct };
  }
  return {
    empty: t.bgSurface2,
    l1: lerpRgb(bg, fg, 0.22),
    l2: lerpRgb(bg, fg, 0.48),
    l3: lerpRgb(bg, fg, 0.76),
    l4: t.correct,
  };
}

function levelColor(level: 0 | 1 | 2 | 3 | 4, palette: ReturnType<typeof heatmapPalette>): string {
  if (level <= 0) return palette.empty;
  if (level === 1) return palette.l1;
  if (level === 2) return palette.l2;
  if (level === 3) return palette.l3;
  return palette.l4;
}

export default function ActivityHeatmap365() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { days, loading } = useActivityHeatmap365Data();
  const [gridInnerW, setGridInnerW] = useState(0);

  const heatPalette = useMemo(() => heatmapPalette(t), [t.correct, t.accent, t.bgSurface2, t.bgCard, t.correctBg]);

  const maxH = useMemo(() => maxGridHeightForScreen(screenH), [screenH]);

  const packed = useMemo(() => {
    const w =
      gridInnerW > 8 ? gridInnerW : Math.max(120, Math.round(screenW - 64));
    return computePackedGrid(w, maxH, CELL_GAP, WINDOW_DAYS);
  }, [gridInnerW, maxH, screenW]);

  const { cols, rows, cellSize } = packed;
  const gridHeight = rows * cellSize + (rows - 1) * CELL_GAP;

  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 1) return;
    setGridInnerW((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  if (loading && days.length === 0) {
    return (
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textMuted, fontSize: f.label }]}>
          {triLang(lang, { ru: 'КАРТА АКТИВНОСТИ', uk: 'КАРТА АКТИВНОСТІ', es: 'MAPA DE ACTIVIDAD' })}
        </Text>
        <ActivityIndicator size="small" color={t.textSecond ?? t.accent} style={{ marginTop: 12 }} />
      </View>
    );
  }

  const legendApprox = Math.max(5, Math.min(13, Math.round(cellSize)));

  return (
    <View style={[styles.card, { borderColor: t.border, backgroundColor: t.bgCard }]}>
      <Text style={[styles.title, { color: t.textMuted, fontSize: f.label }]}>
        {triLang(lang, {
          ru: 'КАРТА АКТИВНОСТИ · 365 ДНЕЙ',
          uk: 'КАРТА АКТИВНОСТІ · 365 ДНІВ',
          es: 'MAPA DE ACTIVIDAD · 365 DÍAS',
        })}
      </Text>

      <View style={{ marginTop: 10, marginBottom: 4, overflow: 'hidden' }} onLayout={onGridLayout}>
        <View
          style={{
            width: cols * cellSize + (cols - 1) * CELL_GAP,
            height: gridHeight,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: CELL_GAP,
            alignSelf: 'center',
          }}
        >
          {days.slice(0, WINDOW_DAYS).map((cell, idx) => {
            const rounded = Math.max(2, Math.min(6, cellSize * 0.24));
            return (
              <View
                key={`${cell.date}-${idx}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: levelColor(cell.level, heatPalette),
                  borderColor: t.border,
                  borderWidth: cell.level > 0 ? 0 : StyleSheet.hairlineWidth,
                  borderRadius: rounded,
                }}
                accessibilityRole="none"
                accessibilityLabel={cell.date}
              />
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <Text style={{ color: t.textGhost, fontSize: f.caption - 2 }}>
          {triLang(lang, { ru: 'Меньше', uk: 'Менше', es: 'Menos' })}
        </Text>
        {([0, 1, 2, 3, 4] as const).map((lv) => (
          <View
            key={lv}
            style={{
              width: legendApprox,
              height: legendApprox,
              borderRadius: Math.max(1, legendApprox / 5),
              backgroundColor: levelColor(lv, heatPalette),
              borderColor: t.border,
              borderWidth: StyleSheet.hairlineWidth,
            }}
          />
        ))}
        <Text style={{ color: t.textGhost, fontSize: f.caption - 2 }}>
          {triLang(lang, { ru: 'Больше', uk: 'Більше', es: 'Más' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
  },
  title: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
});

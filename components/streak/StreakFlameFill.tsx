import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

// зачем (PM-044, решение координатора 01.10): перо серии заменяется огнём, который
// «заполняется до 10 дней» — контур огня и заливка снизу вверх по стадиям 0–10.
// Новых картинок нет: векторный огонь (тот же, что в шапке Главной) и цвета из токенов
// темы. После 10 дней огонь полный и насыщается до яркого тона темы к 30 дням.
// Статичный: без бесконечной анимации и без чтений сервера (PM-044-A2).

export const STREAK_FLAME_FULL_DAYS = 10;
const SATURATION_FULL_DAYS = 30;

/** Доля заливки контура: 0 дней — пусто, 10 и больше — полный огонь. */
export function streakFlameFillRatio(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.min(1, Math.floor(days) / STREAK_FLAME_FULL_DAYS);
}

/** 0…1: насколько огонь уже «разгорелся» после полного заполнения (10 → 30 дней). */
export function streakFlameHeat(days: number): number {
  if (!Number.isFinite(days) || days <= STREAK_FLAME_FULL_DAYS) return 0;
  return Math.min(1, (days - STREAK_FLAME_FULL_DAYS) / (SATURATION_FULL_DAYS - STREAK_FLAME_FULL_DAYS));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  if (h.length < 6) return null;
  const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return n.some((v) => Number.isNaN(v)) ? null : [n[0], n[1], n[2]];
}

/** Смесь двух цветов темы; если цвет не разобрать — берём яркий конец (не выдумываем). */
export function mixThemeColors(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return to;
  const t = Math.max(0, Math.min(1, amount));
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * «Разгор от центра» после 10 дней (владелец 04.10, PM-044): ядро огня — меньший огонь в центре, его
 * заметность растёт от 0 (10 дней) к полной (30 дней). Нужен и в теме «Спокойно», где яркий конец
 * совпадает с обычным белым: там внешний огонь не доходит до чистого белого, и светлое ядро видно.
 */
export function streakFlameCoreOpacity(days: number): number {
  const heat = streakFlameHeat(days);
  return heat <= 0 ? 0 : Math.round((0.35 + heat * 0.65) * 100) / 100;
}

/** Доля смеси «приглушённый → яркий» для внешнего огня; в «Спокойно» потолок ниже, чтобы ядро читалось. */
export function streakFlameOuterMix(days: number, calm: boolean): number {
  const fill = streakFlameFillRatio(days);
  const heat = streakFlameHeat(days);
  return calm ? 0.5 + fill * 0.15 + heat * 0.2 : 0.55 + fill * 0.25 + heat * 0.2;
}

type Props = Readonly<{
  streakDays: number;
  size: number;
  /** Серия прервалась — огонь тусклый, как прежнее «неактивное» перо. */
  inactive?: boolean;
  /**
   * Цвета стадии огня для моментов серии (рубежи 7 → яркий, 30 → второй цвет темы, 100 → белый, 365 → звёздный, 1000 → золотой; образец streak-milestones.html).
   * Нет пропса — огонь рисуется как раньше (Главная, шапка): расчёт от дней и темы не меняется.
   */
  colors?: Readonly<{ outer: string; core: string }>;
}>;

function StreakFlameFillBase({ streakDays, size, inactive = false, colors }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const fill = streakFlameFillRatio(streakDays);
  const calm = !(g.level === 'accent' || g.level === 'max');
  const vivid = calm ? g.text : g.accentBright;
  // Заливка: от приглушённого к яркому тону темы — по мере заполнения и «разогрева».
  const fillColor = colors?.outer ?? mixThemeColors(g.secondary, vivid, streakFlameOuterMix(streakDays, calm));
  // зачем (владелец 04.10): после 10 дней огонь разгорается от центра — светлое ядро, статично.
  const coreOpacity = inactive ? 0 : colors ? 0.85 : streakFlameCoreOpacity(streakDays);
  const coreSize = Math.round(size * 0.5);
  const outlineColor = g.mutedText;
  const filledHeight = Math.round(size * fill);
  return (
    <View
      testID="streak-flame-fill"
      accessible={false}
      style={{ width: size, height: size, opacity: inactive ? 0.42 : 1 }}
    >
      <Ionicons name="flame-outline" size={size} color={outlineColor} style={{ position: 'absolute', left: 0, top: 0 }} />
      {filledHeight > 0 ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: filledHeight, overflow: 'hidden' }}>
          <Ionicons name="flame" size={size} color={fillColor} style={{ position: 'absolute', left: 0, bottom: 0 }} />
        </View>
      ) : null}
      {coreOpacity > 0 ? (
        <Ionicons
          testID="streak-flame-core"
          name="flame"
          size={coreSize}
          color={colors?.core ?? g.text}
          style={{ position: 'absolute', left: Math.round((size - coreSize) / 2), bottom: Math.round(size * 0.08), opacity: coreOpacity }}
        />
      ) : null}
    </View>
  );
}

export const StreakFlameFill = memo(StreakFlameFillBase);

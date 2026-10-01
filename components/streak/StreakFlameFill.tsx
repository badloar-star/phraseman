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

type Props = Readonly<{
  streakDays: number;
  size: number;
  /** Серия прервалась — огонь тусклый, как прежнее «неактивное» перо. */
  inactive?: boolean;
}>;

function StreakFlameFillBase({ streakDays, size, inactive = false }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const fill = streakFlameFillRatio(streakDays);
  const heat = streakFlameHeat(streakDays);
  const vivid = g.level === 'accent' || g.level === 'max' ? g.accentBright : g.text;
  // Заливка: от приглушённого к яркому тону темы — по мере заполнения и «разогрева».
  const fillColor = mixThemeColors(g.secondary, vivid, 0.55 + fill * 0.25 + heat * 0.2);
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
    </View>
  );
}

export const StreakFlameFill = memo(StreakFlameFillBase);

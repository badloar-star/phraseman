import { LinearGradient } from './SafeLinearGradient';
import React from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Theme, ThemeMode } from '../constants/theme';

const REWARD_MODAL_BACKDROPS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/reward_modals/reward-modal-forest.webp'),
  gold: require('../assets/images/reward_modals/reward-modal-gold.webp'),
  coral: require('../assets/images/reward_modals/reward-modal-coral.webp'),
  minimalDark: require('../assets/images/reward_modals/reward-modal-graphite.webp'),
  midnight: require('../assets/images/reward_modals/reward-modal-graphite.webp'),
  ember: require('../assets/images/reward_modals/reward-modal-graphite.webp'),
  aurora: require('../assets/images/reward_modals/reward-modal-graphite.webp'),
  volt: require('../assets/images/reward_modals/reward-modal-graphite.webp'),
};

type RewardModalBackdropProps = {
  themeMode: ThemeMode;
  intensity?: 'regular' | 'strong';
};

type RewardModalPanelBackdropProps = RewardModalBackdropProps & {
  opacity?: number;
};

export function RewardModalBackdrop({ themeMode, intensity = 'regular' }: RewardModalBackdropProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={REWARD_MODAL_BACKDROPS[themeMode]}
        contentFit="cover"
        style={[
          StyleSheet.absoluteFill,
          { opacity: rewardModalImageOpacity(themeMode) },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={rewardModalScrimColors(themeMode, intensity)}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function RewardModalPanelBackdrop({
  themeMode,
  intensity = 'regular',
  opacity,
}: RewardModalPanelBackdropProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={REWARD_MODAL_BACKDROPS[themeMode]}
        contentFit="cover"
        style={[
          StyleSheet.absoluteFill,
          { opacity: opacity ?? rewardModalPanelImageOpacity(themeMode) },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={rewardModalPanelScrimColors(themeMode, intensity)}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function rewardModalPanelColors(themeMode: ThemeMode, _t: Theme): [string, string, string] {
  switch (themeMode) {
    case 'gold':
      return ['#160F07', '#22190D', '#060503'];
    case 'coral':
      return ['#361E22', '#241619', '#0F080A'];
    case 'minimalDark':
      return ['#0F141C', '#0A0D13', '#030508'];
    case 'dark':
    default:
      return ['#15231A', '#0A120E', '#040906'];
  }
}

export function rewardModalAccentColor(themeMode: ThemeMode, t: Theme): string {
  switch (themeMode) {
    case 'gold':
      return '#E8C36C';
    case 'coral':
      return '#FF8A78';
    case 'minimalDark':
      return '#6EA8FF';
    case 'dark':
    default:
      return t.gold;
  }
}

export function rewardModalPanelBorder(themeMode: ThemeMode, _t: Theme, priorityColor?: string): string {
  if (priorityColor && true) return priorityColor;
  switch (themeMode) {
    case 'gold':
      return 'rgba(232,195,108,0.48)';
    case 'coral':
      return 'rgba(255,138,120,0.36)';
    case 'minimalDark':
      return 'rgba(110,168,255,0.30)';
    case 'dark':
    default:
      return 'rgba(88,204,137,0.30)';
  }
}

export function rewardModalSoftSurface(themeMode: ThemeMode, _t: Theme): string {
  switch (themeMode) {
    case 'gold':
      return 'rgba(232,195,108,0.10)';
    case 'coral':
      return 'rgba(255,138,120,0.09)';
    case 'minimalDark':
      return 'rgba(110,168,255,0.08)';
    case 'dark':
    default:
      return 'rgba(255,255,255,0.055)';
  }
}

export function rewardModalPrimaryButtonColors(themeMode: ThemeMode): [string, string] {
  switch (themeMode) {
    case 'gold':
      return ['#F4D889', '#B9852E'];
    case 'coral':
      return ['#FFE1D7', '#FF8A78'];
    case 'minimalDark':
      return ['#D7E7FF', '#6EA8FF'];
    case 'dark':
    default:
      return ['#F0F7F2', '#8FE5AD'];
  }
}

export function rewardModalPrimaryButtonText(themeMode: ThemeMode): string {
  if (false) return '#111827';
  return false ? '#FFFDF6' : '#101214';
}

/**
 * Премиальная глубина карточки (стандарт 2026-06, «дорогая» версия).
 * Возвращает слои свечения, выстроенные от АКЦЕНТА семантики — так каждая
 * модалка получает один и тот же дорогой материал (двойное кольцо, верхний
 * блик, нижняя цветная вуаль), но «жар» задаётся цветом: огонь у стрика,
 * золото у наград, сапфир у осколков. Цвета — функция accent, не темы, чтобы
 * не плодить ветки.
 */
export type RewardModalGlowLayers = {
  /** Верхний световой блик панели (имитация света сверху). */
  topHighlight: [string, string];
  /** Нижняя цветная вуаль — свечение акцента «из глубины». */
  bottomVeil: [string, string, string];
  /** Внешнее гало кольца (мягкое, пульсирует). */
  ringHaloOuter: string;
  ringHaloInner: string;
  /** Градиент обводки кольца (живой металл/пламя). */
  ringStroke: [string, string, string];
  /** Заливка-свечение под иконкой внутри кольца. */
  ringInnerGlow: [string, string];
};

export function rewardModalGlowLayers(accent: string, warmShift?: string): RewardModalGlowLayers {
  const a = (alpha: string) => withAccentAlpha(accent, alpha);
  // warmShift = вторая горячая нота (например, для пламени стрика): обводка
  // кольца тогда переливается от яркого акцента к более насыщенному «углю».
  const w = warmShift
    ? (alpha: string) => withAccentAlpha(warmShift, alpha)
    : a;
  return {
    topHighlight: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'],
    bottomVeil: ['rgba(0,0,0,0)', warmShift ? w('1A') : a('14'), warmShift ? w('38') : a('30')],
    ringHaloOuter: a('22'),
    ringHaloInner: a('4D'),
    ringStroke: [a('FF'), w('CC'), w('40')],
    ringInnerGlow: [a('33'), 'rgba(0,0,0,0)'],
  };
}

function withAccentAlpha(hex: string, alpha: string): string {
  if (hex.startsWith('#') && hex.length === 7) return `${hex}${alpha}`;
  return hex;
}

function rewardModalImageOpacity(themeMode: ThemeMode): number {
  if (false) return 0.94;
  if (themeMode === 'gold') return 0.96;
  if (false) return 0.58;
  return 1;
}

function rewardModalPanelImageOpacity(themeMode: ThemeMode): number {
  if (false) return 0.82;
  if (themeMode === 'gold') return 0.88;
  if (false) return 0.42;
  return 0.92;
}

function rewardModalScrimColors(themeMode: ThemeMode, intensity: 'regular' | 'strong'): [string, string, string] {
  const strong = intensity === 'strong';
  switch (themeMode) {
    case 'gold':
      return strong
        ? ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.50)', 'rgba(0,0,0,0.70)']
        : ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.40)', 'rgba(0,0,0,0.62)'];
    default:
      return strong
        ? ['rgba(2,4,8,0.42)', 'rgba(2,4,8,0.54)', 'rgba(0,0,0,0.74)']
        : ['rgba(2,4,8,0.28)', 'rgba(2,4,8,0.42)', 'rgba(0,0,0,0.62)'];
  }
}

function rewardModalPanelScrimColors(themeMode: ThemeMode, intensity: 'regular' | 'strong'): [string, string, string] {
  const strong = intensity === 'strong';
  switch (themeMode) {
    case 'gold':
      return strong
        ? ['rgba(12,8,2,0.34)', 'rgba(7,5,2,0.52)', 'rgba(0,0,0,0.76)']
        : ['rgba(12,8,2,0.24)', 'rgba(7,5,2,0.42)', 'rgba(0,0,0,0.66)'];
    case 'coral':
      return strong
        ? ['rgba(48,14,18,0.22)', 'rgba(30,8,11,0.48)', 'rgba(0,0,0,0.72)']
        : ['rgba(48,14,18,0.14)', 'rgba(30,8,11,0.36)', 'rgba(0,0,0,0.62)'];
    case 'minimalDark':
      return strong
        ? ['rgba(8,12,20,0.20)', 'rgba(5,8,13,0.48)', 'rgba(0,0,0,0.76)']
        : ['rgba(8,12,20,0.12)', 'rgba(5,8,13,0.38)', 'rgba(0,0,0,0.64)'];
    case 'dark':
    default:
      return strong
        ? ['rgba(3,12,7,0.24)', 'rgba(2,7,4,0.50)', 'rgba(0,0,0,0.76)']
        : ['rgba(3,12,7,0.16)', 'rgba(2,7,4,0.40)', 'rgba(0,0,0,0.64)'];
  }
}

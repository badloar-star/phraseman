import { LinearGradient } from './SafeLinearGradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Theme, ThemeMode } from '../constants/theme';
import { OLIVE_GRADIENTS, OLIVE_RICH } from '../constants/oliveTheme';
import { isLightSurface } from '../constants/color_contrast';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

type RewardModalBackdropProps = {
  themeMode: ThemeMode;
  intensity?: 'regular' | 'strong';
  /**
   * dev-only/опционально: если задан — бэкдроп сам играет вход/выход opacity
   * (LUM.resolveMs/exitMs, «Световод») вместо статичного рендера. Не задан
   * (все 8 текущих потребителей) → поведение НЕ меняется, компонент рисуется
   * как раньше без анимации — родитель (нативный Modal fade / свой Reanimated)
   * уже отвечает за переход, дублировать его нельзя.
   */
  visible?: boolean;
  /**
   * зачем: 'hybrid' — затемнение входит/уходит по LUM.resolveMs/exitMs (нужен
   * `visible`); 'classic' (default) — статичный бэкдроп, как у всех текущих
   * потребителей. Единообразие с контрактом движения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

type RewardModalPanelBackdropProps = RewardModalBackdropProps & {
  opacity?: number;
};

type RewardModalLiquidGlassProps = {
  themeMode: ThemeMode;
  accent: string;
  intensity?: 'regular' | 'strong';
};

export function RewardModalBackdrop({ themeMode, intensity = 'regular', visible, motionVariant = 'classic' }: RewardModalBackdropProps) {
  const reduceMotion = useReduceMotion();
  // зачем: fade — при явном hybrid или когда вызывающий ведёт visible (обратная совместимость)
  const animated = motionVariant === 'hybrid' || visible !== undefined;
  const fade = useSharedValue(animated && !visible ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    if (reduceMotion) {
      fade.value = visible ? 1 : 0;
      return;
    }
    fade.value = withTiming(visible ? 1 : 0, {
      duration: visible ? LUM.resolveMs : LUM.exitMs,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
    return () => cancelAnimation(fade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, visible, reduceMotion]);

  const fadeStyle = useAnimatedStyle(() => (animated ? { opacity: fade.value } : { opacity: 1 }));

  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fadeStyle]}>
      <LinearGradient
        pointerEvents="none"
        colors={rewardModalBackdropGradientColors(themeMode)}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={rewardModalScrimColors(themeMode, intensity)}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Reanimated.View>
  );
}

export function RewardModalPanelBackdrop({
  themeMode,
  intensity = 'regular',
  opacity,
}: RewardModalPanelBackdropProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        pointerEvents="none"
        colors={rewardModalPanelGradientColors(themeMode)}
        locations={[0, 0.46, 1]}
        style={[StyleSheet.absoluteFill, { opacity: opacity ?? 1 }]}
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

/**
 * Static "liquid glass" illusion for reward/gift modals.
 *
 * Deliberately avoids realtime native blur/backdrop filters: this is only gradients,
 * highlights and tonal veils, so it keeps the premium material feeling without
 * adding a realtime blur cost on low-end devices.
 */
export function RewardModalLiquidGlass({
  themeMode,
  accent,
  intensity = 'regular',
}: RewardModalLiquidGlassProps) {
  if (themeMode === 'olive') return null;
  if (themeMode === 'sagePorcelain') return null;
  const strong = intensity === 'strong';
  const accentVeil = withAccentAlpha(accent, strong ? '42' : '30');
  const accentSoft = withAccentAlpha(accent, strong ? '24' : '18');
  const topLight = themeMode === 'gold'
    ? 'rgba(255,232,172,0.20)'
    : 'rgba(255,255,255,0.18)';
  const sideLight = themeMode === 'gold'
    ? 'rgba(255,213,128,0.16)'
    : 'rgba(255,255,255,0.12)';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="reward-modal-liquid-glass">
      <LinearGradient
        pointerEvents="none"
        colors={[topLight, 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0)']}
        locations={[0, 0.42, 1]}
        style={[StyleSheet.absoluteFill, { opacity: strong ? 0.86 : 0.68 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', accentSoft, accentVeil]}
        locations={[0, 0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 22,
          right: 22,
          height: 1,
          backgroundColor: topLight,
          opacity: strong ? 0.9 : 0.68,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 18,
          left: -34,
          width: 112,
          height: 220,
          borderRadius: 80,
          backgroundColor: sideLight,
          opacity: strong ? 0.34 : 0.24,
          transform: [{ rotate: '18deg' }],
        }}
      />
    </View>
  );
}

export function rewardModalPanelColors(themeMode: ThemeMode, _t: Theme): [string, string, string] {
  switch (themeMode) {
    case 'olive':
      return [...OLIVE_GRADIENTS.quietPanel];
    case 'gold':
      return ['#160F07', '#22190D', '#060503'];
    case 'business':
      return ['#101820', '#182536', '#070A0F'];
    case 'midnight':
      return ['#081124', '#0C1832', '#030711'];
    case 'ember':
      return ['#211008', '#2B160B', '#080302'];
    case 'aurora':
      return ['#071B1D', '#102035', '#04080D'];
    case 'volt':
      return ['#111905', '#1B2608', '#050702'];
    case 'minimalDark':
      return ['#0F141C', '#0A0D13', '#030508'];
    case 'candyBlue':
      return ['#0B161B', '#122229', '#04090C'];
    case 'indigo':
      return ['#14131F', '#1C1B2E', '#060510'];
    case 'sagePorcelain':
      return ['#FCFDF9', '#F5F7F2', '#E7EAE3'];
    case 'dark':
    default:
      return ['#15231A', '#0A120E', '#040906'];
  }
}

export function rewardModalAccentColor(themeMode: ThemeMode, t: Theme): string {
  switch (themeMode) {
    case 'olive':
      return OLIVE_RICH.champagne;
    case 'gold':
      return '#E8C36C';
    case 'business':
      return '#7DD3FC';
    case 'midnight':
      return '#8EA7FF';
    case 'ember':
      return '#F59E0B';
    case 'aurora':
      return '#67E8F9';
    case 'volt':
      return '#C8F336';
    case 'minimalDark':
      return '#6EA8FF';
    case 'candyBlue':
      return '#B2D5E5';
    case 'indigo':
      return '#C8C3FF';
    case 'sagePorcelain':
      return '#315F50';
    case 'dark':
    default:
      return t.gold;
  }
}

export function rewardModalPanelBorder(themeMode: ThemeMode, _t: Theme, priorityColor?: string): string {
  if (themeMode === 'olive') return 'transparent';
  if (priorityColor && true) return priorityColor;
  switch (themeMode) {
    case 'gold':
      return 'rgba(232,195,108,0.48)';
    case 'business':
      return 'rgba(125,211,252,0.34)';
    case 'midnight':
      return 'rgba(142,167,255,0.34)';
    case 'ember':
      return 'rgba(245,158,11,0.38)';
    case 'aurora':
      return 'rgba(103,232,249,0.34)';
    case 'volt':
      return 'rgba(200,243,54,0.34)';
    case 'minimalDark':
      return 'rgba(110,168,255,0.30)';
    case 'candyBlue':
      return 'rgba(178,213,229,0.30)';
    case 'indigo':
      return 'rgba(200,195,255,0.30)';
    case 'sagePorcelain':
      return '#BDC8BD';
    case 'dark':
    default:
      return 'rgba(88,204,137,0.30)';
  }
}

export function rewardModalSoftSurface(themeMode: ThemeMode, _t: Theme): string {
  switch (themeMode) {
    case 'olive':
      return 'rgba(244,236,216,0.07)';
    case 'gold':
      return 'rgba(232,195,108,0.10)';
    case 'business':
      return 'rgba(125,211,252,0.09)';
    case 'midnight':
      return 'rgba(142,167,255,0.09)';
    case 'ember':
      return 'rgba(245,158,11,0.10)';
    case 'aurora':
      return 'rgba(103,232,249,0.09)';
    case 'volt':
      return 'rgba(200,243,54,0.09)';
    case 'minimalDark':
      return 'rgba(110,168,255,0.08)';
    case 'candyBlue':
      return 'rgba(178,213,229,0.08)';
    case 'indigo':
      return 'rgba(200,195,255,0.08)';
    case 'sagePorcelain':
      return '#E1E5DC';
    case 'dark':
    default:
      return 'rgba(255,255,255,0.055)';
  }
}

export function rewardModalPrimaryButtonColors(themeMode: ThemeMode): [string, string] {
  switch (themeMode) {
    case 'olive':
      return [OLIVE_GRADIENTS.primaryButton[0], OLIVE_GRADIENTS.primaryButton[1]];
    case 'gold':
      return ['#F4D889', '#B9852E'];
    case 'business':
      return ['#DDF7FF', '#38BDF8'];
    case 'midnight':
      return ['#E0E7FF', '#818CF8'];
    case 'ember':
      return ['#FED7AA', '#F97316'];
    case 'aurora':
      return ['#CCFBF1', '#22D3EE'];
    case 'volt':
      return ['#ECFCCB', '#A3E635'];
    case 'minimalDark':
      return ['#D7E7FF', '#6EA8FF'];
    case 'candyBlue':
      return ['#E4F2F8', '#B2D5E5'];
    case 'indigo':
      return ['#ECEAFF', '#C8C3FF'];
    case 'sagePorcelain':
      return ['#315F50', '#315F50'];
    case 'dark':
    default:
      return ['#F0F7F2', '#8FE5AD'];
  }
}

export function rewardModalPrimaryButtonText(themeMode: ThemeMode): string {
  switch (themeMode) {
    case 'olive':
      return '#07110A';
    case 'sagePorcelain':
      return '#FFFFFF';
    default:
      return '#101214';
  }
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

export function rewardModalBackdropGradientColors(themeMode: ThemeMode): [string, string, string] {
  switch (themeMode) {
    case 'gold':
      return ['#2A1707', '#171006', '#050302'];
    case 'business':
      return ['#102A3D', '#0E1624', '#05070B'];
    case 'midnight':
      return ['#101C46', '#081126', '#02040B'];
    case 'ember':
      return ['#351408', '#1A0803', '#050201'];
    case 'aurora':
      return ['#063034', '#101A33', '#03070C'];
    case 'volt':
      return ['#22320A', '#101805', '#030501'];
    case 'minimalDark':
      return ['#101824', '#090D15', '#020407'];
    case 'candyBlue':
      return ['#122229', '#0B161B', '#020506'];
    case 'indigo':
      return ['#1C1B2E', '#14131F', '#040309'];
    case 'sagePorcelain':
      return ['#DCE1D8', '#FCFDF9', '#CDD5C7'];
    case 'dark':
    default:
      return ['#0F2718', '#07110C', '#020503'];
  }
}

export function rewardModalPanelGradientColors(themeMode: ThemeMode): [string, string, string] {
  switch (themeMode) {
    case 'gold':
      return ['#3A260C', '#1C1307', '#070402'];
    case 'business':
      return ['#12314A', '#132235', '#070A10'];
    case 'midnight':
      return ['#14235A', '#0B1731', '#030711'];
    case 'ember':
      return ['#3A1708', '#251006', '#070201'];
    case 'aurora':
      return ['#07383B', '#13213D', '#04080D'];
    case 'volt':
      return ['#2B3C0B', '#182206', '#050701'];
    case 'minimalDark':
      return ['#152032', '#0A101B', '#030508'];
    case 'candyBlue':
      return ['#1C323B', '#0E1C22', '#020506'];
    case 'indigo':
      return ['#2A2952', '#16152A', '#040309'];
    case 'sagePorcelain':
      return ['#FCFDF9', '#F5F7F2', '#E7EAE3'];
    case 'dark':
    default:
      return ['#13301D', '#0A150F', '#030604'];
  }
}

export function rewardModalScrimColors(themeMode: ThemeMode, intensity: 'regular' | 'strong'): [string, string, string] {
  const strong = intensity === 'strong';
  // зачем: раньше светлая ветка была прибита к единственному имени темы
  // ('sagePorcelain') — ровно класс бага из isLightSurface (список светлых
  // тем неполон, новая светлая тема завтра снова забудется). Проверяем
  // РЕАЛЬНУЮ светлость панели этой темы (rewardModalPanelGradientColors[0]),
  // а не имя — тон затемнения подбирается по факту, не по switch-энумерации.
  if (isLightSurface(rewardModalPanelGradientColors(themeMode)[0])) {
    const opacity = strong ? '0.38' : '0.26';
    return [`rgba(23,32,29,${opacity})`, `rgba(23,32,29,${opacity})`, `rgba(23,32,29,${opacity})`];
  }
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

export function rewardModalPanelScrimColors(themeMode: ThemeMode, intensity: 'regular' | 'strong'): [string, string, string] {
  const strong = intensity === 'strong';
  switch (themeMode) {
    case 'sagePorcelain':
      return ['rgba(23,32,29,0)', 'rgba(23,32,29,0)', 'rgba(23,32,29,0)'];
    case 'gold':
      return strong
        ? ['rgba(12,8,2,0.34)', 'rgba(7,5,2,0.52)', 'rgba(0,0,0,0.76)']
        : ['rgba(12,8,2,0.24)', 'rgba(7,5,2,0.42)', 'rgba(0,0,0,0.66)'];
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

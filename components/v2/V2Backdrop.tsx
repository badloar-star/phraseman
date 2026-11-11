import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme, useThemeGlowDraftId } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useAfterFirstFrame } from '../../hooks/use-after-first-frame';
import { useV2Palette } from './useV2Palette';

// зачем (темы 2.0, «Максимум»): три мягких пятна цвета темы — ровно как в макете
// themes-v2-proposals (.vv .ph). Позиции/размеры в долях экрана. Статично: ноль работы
// после первого кадра, без анимаций и без перерисовки при скролле.
const GLOW_SPOTS = [
  { id: 'v2bgGlow1', cx: '6%', cy: '2%', rx: '78%', ry: '36%', end: 0.72 },
  { id: 'v2bgGlow2', cx: '108%', cy: '56%', rx: '62%', ry: '32%', end: 0.74 },
  { id: 'v2bgGlow3', cx: '26%', cy: '108%', rx: '80%', ry: '28%', end: 0.76 },
] as const;

// зачем (владелец 11.11, макет «Аврора» 1 в 1): у «Авроры» четыре тихих пятна света по углам страницы — те же места и размеры, что в макете (.plain-bg)
const AURORA_SPOTS = [
  { id: 'v2bgAur1', cx: '0%', cy: '0%', rx: '90%', ry: '22%', end: 0.72, color: 1 },
  { id: 'v2bgAur2', cx: '100%', cy: '4%', rx: '90%', ry: '24%', end: 0.72, color: 0 },
  { id: 'v2bgAur3', cx: '0%', cy: '54%', rx: '70%', ry: '26%', end: 0.72, color: 0 },
  { id: 'v2bgAur4', cx: '100%', cy: '84%', rx: '80%', ry: '30%', end: 0.72, color: 1 },
] as const;

const solid = (hex: string) => (hex.length === 9 ? hex.slice(0, 7) : hex);
const opacityOf = (hex: string) => (hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1);

const ThemeGlow = memo(function ThemeGlow({ colors, aurora = false }: { colors: readonly [string, string, string]; aurora?: boolean }) {
  if (aurora) {
    return (
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {AURORA_SPOTS.map((spot) => (
            <RadialGradient key={spot.id} id={spot.id} cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} fx={spot.cx} fy={spot.cy}>
              <Stop offset="0" stopColor={solid(colors[spot.color]!)} stopOpacity={opacityOf(colors[spot.color]!)} />
              <Stop offset={String(spot.end)} stopColor={solid(colors[spot.color]!)} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {AURORA_SPOTS.map((spot) => <Rect key={spot.id} x="0" y="0" width="100%" height="100%" fill={`url(#${spot.id})`} />)}
      </Svg>
    );
  }
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        {GLOW_SPOTS.map((spot, i) => (
          <RadialGradient key={spot.id} id={spot.id} cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} fx={spot.cx} fy={spot.cy}>
            <Stop offset="0" stopColor={solid(colors[i]!)} stopOpacity={opacityOf(colors[i]!)} />
            <Stop offset={String(spot.end)} stopColor={solid(colors[i]!)} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {GLOW_SPOTS.map(spot => (
        <Rect key={spot.id} x="0" y="0" width="100%" height="100%" fill={`url(#${spot.id})`} />
      ))}
    </Svg>
  );
});

/**
 * Фон экранов 2.0: ровный тёмный с едва заметным светлым верхом.
 * Статичный градиент: без анимаций и без перерисовки при скролле.
 */
/** Проявление пятен со 2-го кадра — тот же FadeIn, что у героя «Сцены» (280 мс, сильное ease-out). */
const GLOW_EASE = Easing.bezier(0.23, 1, 0.32, 1);

type V2BackdropProps = Readonly<{
  /** Пятна темы — со 2-го кадра тем же FadeIn (фон оболочки вкладок; координатор 22.10). Итоговый вид прежний. */
  deferGlow?: boolean;
}>;

function V2Backdrop({ deferGlow = false }: V2BackdropProps) {
  const p = useV2Palette();
  const { liquidGlassThemeId, liquidGlassIntensity, liquidGlassAppearance } = useTheme();
  // зачем: владелец 24.09 — «пятна света на фоне убрать»: фон ровный тёмный,
  // глубину дают сами карточки (дымка внутри стекла), а не фон.
  // Исключения: верхняя половина ползунка у тонированных тем (бывший «Максимум», 30.09) и
  // градиентные темы (04.10, пятна видны при любой насыщенности). Решает сама палитра:
  // есть непрозрачное пятно — рисуем один статичный слой, нет — слоя нет вовсе.
  const tokens = liquidGlassTokens(liquidGlassThemeId, { level: 'calm', appearance: liquidGlassAppearance, intensity: liquidGlassIntensity });
  // зачем (владелец 11.11 «ползунки подтормаживают»): на экране «Оформление» пятна красятся по своему, более редкому черновику — полноэкранный SVG
  // не перерисовывается на каждый шаг ползунка (ThemeDraftScope в ThemeContext). Вне этого экрана черновика нет и всё работает как раньше.
  const glowDraftId = useThemeGlowDraftId();
  const glowTokens = glowDraftId !== null && glowDraftId !== liquidGlassThemeId
    ? liquidGlassTokens(glowDraftId, { level: 'calm', appearance: liquidGlassAppearance, intensity: liquidGlassIntensity })
    : tokens;
  const glow = glowTokens.bgGlow.some(c => opacityOf(c) > 0) ? glowTokens.bgGlow : null;
  // зачем (ускорение первого кадра Главной; координатор 22.10: «пятна НЕ убирать — на первом кадре их нет, со 2-го тихо проявляются
  // тем же FadeIn, что и герой»): SVG трёх радиалов не растеризуется на первом кадре; смонтирован один раз — смена вкладок его не трогает
  const glowReady = useAfterFirstFrame('backdrop:glow', deferGlow && glow !== null);
  const reduceMotion = useReducedMotion();
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={tokens.aurora ? [tokens.aurora.bgTop, tokens.aurora.bg] : [p.bgTop, p.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      {glow && glowReady ? (
        deferGlow && !reduceMotion ? (
          <Animated.View pointerEvents="none" entering={FadeIn.duration(280).easing(GLOW_EASE)} style={StyleSheet.absoluteFill}>
            <ThemeGlow colors={glow} aurora={Boolean(tokens.aurora)} />
          </Animated.View>
        ) : <ThemeGlow colors={glow} aurora={Boolean(tokens.aurora)} />
      ) : null}
    </>
  );
}

export default memo(V2Backdrop);

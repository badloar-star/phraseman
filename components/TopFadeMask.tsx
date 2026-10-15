import React, { useEffect, useRef, useState } from 'react';
import { Animated, InteractionManager, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from './SafeLinearGradient';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useTheme } from './ThemeContext';
import { topFadeScrim } from './topFadeScrim';
import V2Backdrop from './v2/V2Backdrop';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,1)'; // theme-exempt: маска затухания: цвет задаёт только альфу, не вид
const EXEMPT_COLOR_2 = 'rgba(0,0,0,0)'; // theme-exempt: маска затухания: цвет задаёт только альфу, не вид

const DEFAULT_FEATHER_HEIGHT = 36;

export interface TopFadeMaskProps {
  /**
   * Optional visible header height below the safe area. Default screens use 0,
   * so only the top safe zone is tinted.
   */
  headerHeight?: number;
  /**
   * Feather extension below the safe area/header. This is an alpha mask fade,
   * not stacked blur bands.
   */
  extra?: number;
  /** Static tint strength 0..1. */
  maxOpacity?: number;
  /** Kept for API compatibility with the previous feathered implementation. */
  solidRatio?: number;
  tone?: 'dark' | 'light';
  scrollY?: Animated.Value;
  showThreshold?: number;
  zIndex?: number;
  style?: ViewStyle;
}

const loggedScrims = new Set<string>();

function rgbaWithAlpha(rgb: string, a: number): string {
  const clamped = Math.min(1, Math.max(0, a));
  return `rgba(${rgb},${clamped.toFixed(3)})`;
}

/**
 * зачем (🔴 владельца 15.10: «полоса под часами и батареей немного отличается по цвету от остального фона — должно быть единое полотно»): раньше скрим был плоской заливкой —
 * чёрной с альфой 0,446 в тёмных темах и цветом bgTop с альфой 0,8 в светлых, — а настоящий фон экрана это градиент bgTop → bg с цветными пятнами темы (V2Backdrop). Плоская заливка
 * поверх градиента с пятнами всегда чуть не того тона («Океан», «Сумерки» — заметнее всего). Теперь без явного `tone` скрим — КОПИЯ самого полотна (тот же V2Backdrop, привязанный к верху экрана
 * и обрезанный по высоте маски), а плавность дают маска-градиент по альфе: цвет полосы совпадает с фоном пиксель в пиксель в любой теме, контент под ней растворяется.
 */
function CanvasCopy({ windowHeight }: Readonly<{ windowHeight: number }>) {
  return (
    <View pointerEvents="none" style={[styles.canvasCopy, { height: windowHeight }]}>
      <V2Backdrop />
    </View>
  );
}

export default function TopFadeMask({
  headerHeight = 0,
  extra = DEFAULT_FEATHER_HEIGHT,
  maxOpacity = 0.72,
  tone,
  scrollY,
  showThreshold = 6,
  zIndex = 5,
  style,
}: TopFadeMaskProps) {
  const insets = useStableSafeAreaInsets();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const maskOpacity = useRef(new Animated.Value(scrollY ? 0 : 1)).current;
  const shownRef = useRef(!scrollY);
  const windowHeight = useWindowDimensions().height;
  // зачем (производительность старта, правило владельца): копия полотна — статичный градиент с SVG-пятнами; на скрытой маске (вкладки показывают её только после прокрутки) она монтируется
  // уже ПОСЛЕ первого кадра и переходов (InteractionManager), а у постоянно видимой маски — сразу. Холодный старт и первый кадр вкладок не получают лишней работы.
  const [canvasArmed, setCanvasArmed] = useState(!scrollY);
  useEffect(() => {
    if (canvasArmed) return undefined;
    const task = InteractionManager.runAfterInteractions(() => setCanvasArmed(true));
    return () => task.cancel();
  }, [canvasArmed]);

  useEffect(() => {
    if (!scrollY) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const shouldShow = value > showThreshold;
      if (shouldShow === shownRef.current) return;
      shownRef.current = shouldShow;
      Animated.timing(maskOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: shouldShow ? 180 : 260,
        useNativeDriver: true,
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, showThreshold, maskOpacity]);

  const height = insets.top + headerHeight + extra;
  if (height <= 0) return null;

  const animatedOpacity = scrollY ? maskOpacity : undefined;
  const resolved = topFadeScrim(glass.isLight, glass.bgTop, maxOpacity, tone);
  const scrim = rgbaWithAlpha(resolved.rgb, resolved.alpha);
  // явный tone (экраны с картинкой/видео под полосой) — прежняя плоская заливка; без tone — копия полотна (единый фон со статус-баром)
  const useCanvas = tone === undefined;
  const logKey = `${liquidGlassThemeId}/${glass.isLight ? 'light' : 'dark'}/${tone ?? 'auto'}`;
  if (!loggedScrims.has(logKey)) {
    loggedScrims.add(logKey);
    console.log(`[HOME-PLATE] topscrim theme=${liquidGlassThemeId} isLight=${String(glass.isLight)} tone=${tone ?? 'auto'} scrim=${useCanvas ? 'canvas-copy' : scrim} source=${useCanvas ? 'V2Backdrop (копия полотна экрана)' : resolved.source} height=${height}`);
    console.log(`[STATUSBAR-CANVAS] theme=${liquidGlassThemeId} mode=${useCanvas ? 'canvas-copy' : 'flat-tone'} safeTop=${Math.round(insets.top)} featherExtra=${extra} windowH=${Math.round(windowHeight)} armed=${String(canvasArmed)}`); // guard-ok: одна строка на тему — чем закрыта верхняя полоса
  }
  const featherStart = Math.max(0, Math.min(1, (height - extra) / height));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.mask, { height, zIndex, elevation: zIndex }, style, animatedOpacity ? { opacity: animatedOpacity } : null]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={[EXEMPT_COLOR_1, 'rgba(0,0,0,1)', EXEMPT_COLOR_2]} // theme-exempt: маска затухания — цвета-носители альфы, не оттенок
            locations={[0, featherStart, 1]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        {useCanvas ? (canvasArmed ? <CanvasCopy windowHeight={windowHeight} /> : null) : <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />}
      </MaskedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  // копия полотна: привязана к верху экрана, высота = высота окна (градиент полотна считается от высоты экрана), обрезается маской по высоте полосы
  canvasCopy: { position: 'absolute', top: 0, left: 0, right: 0 },
});

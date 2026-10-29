// ═══════════════════════════════════════════════════════════════════════════
// SceneBackdropFill.tsx — фон «Сцены» экрана: сам берёт тему и оформление, меряет свою область и рисует SceneBackdrop по scenePalette.
//
// зачем (вердикт владельца 29.10, координатор: «каждый экран со сценой берёт цвета только из scenePalette, лог [SCENE-THEME] на каждом»): экраны, где область сцены
// определяется раскладкой (обложка Сезона, приветствие языка, aha), не считают палитру руками — кладут этот слой на всю область. До первой раскладки (размера ещё нет)
// показывается вертикальный градиент fallback, чтобы первый кадр не был пустым. Палитра — из кэша модуля (один расчёт на тему/оформление/экран/размер).
// В журнал [SCENE-THEME] пишется один раз на смену темы/оформления/размера: экран, режим, время расчёта, верх/низ.
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useState } from 'react';
import { PixelRatio, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { logSceneTheme } from '../home/v2/scene/scene_theme_log';
import { useTheme } from '../ThemeContext';
import SceneBackdrop from './SceneBackdrop';
import { sceneBottomHex, sceneTopHex, scenePaletteCached, type SceneScreen } from './scene_palette';

type Props = Readonly<{
  screen: SceneScreen;
  /** Журнальное имя экрана ([SCENE-THEME] <name>). */
  logName: string;
  idPrefix: string;
  /** Цвета вертикального градиента до первой раскладки. */
  fallback: readonly [string, string];
}>;
type Size = Readonly<{ w: number; h: number }>;

function SceneBackdropFill({ screen, logName, idPrefix, fallback }: Props) {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w <= 0 || h <= 0) return;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);
  const dpr = PixelRatio.get();
  let palette = null;
  if (size) {
    const t0 = Date.now();
    palette = scenePaletteCached(liquidGlassThemeId, liquidGlassAppearance, screen, size.w * dpr, size.h * dpr, dpr);
    logSceneTheme(logName, liquidGlassThemeId, liquidGlassAppearance, `scenePalette(${palette.mode})`, { mode: palette.mode, ms: Date.now() - t0, w: size.w, h: size.h, top: sceneTopHex(palette), bottom: sceneBottomHex(palette) });
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {palette ? (
        <SceneBackdrop palette={palette} idPrefix={idPrefix} />
      ) : (
        <LinearGradient pointerEvents="none" colors={[fallback[0], fallback[1]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

export default memo(SceneBackdropFill);

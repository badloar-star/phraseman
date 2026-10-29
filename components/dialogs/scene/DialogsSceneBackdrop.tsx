// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneBackdrop.tsx — подложка «Сцены» «Диалогов»: утверждённая сцена (тёмное «Глубокое небо», светлое «А») из scenePalette.
//
// зачем (вердикт владельца 29.10: «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, все экраны»; закрывает и чёрные пятна светлых grad_*: свечений из
// прозрачного цвета больше нет вовсе): одна и та же подложка у сцены хаба и у верха листа согласия (DialogsConsentTop) — рисует общий SceneBackdrop по реальному размеру
// области. До первой раскладки (размера ещё нет) показывает вертикальный градиент «зенит → низ» тех же цветов, чтобы первый кадр не был пустым (colors.top/bottom теперь
// тоже из scenePalette). idPrefix разводит id градиентов, когда две подложки на экране. Касаний не ловит, заполняет родителя (absoluteFill).
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import { mixPremiumHex } from '../../../constants/premiumThemeVisualSpecs'; // зачем: тон середины для низа без затемнения
import React, { memo, useCallback, useState } from 'react';
import { PixelRatio, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { logSceneEdge } from '../../home/v2/scene/scene_theme_log';

import SceneBackdrop from '../../scene/SceneBackdrop';
import { scenePaletteCached } from '../../scene/scene_palette';
import { useTheme } from '../../ThemeContext';
import type { DialogsSceneColors } from './dialogs_scene_tokens';

type Props = Readonly<{ colors: DialogsSceneColors; idPrefix: string }>;
type Size = Readonly<{ w: number; h: number }>;

function DialogsSceneBackdrop({ colors: c, idPrefix }: Props) {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w <= 0 || h <= 0) return;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);
  const dpr = PixelRatio.get();
  const { height: windowH } = useWindowDimensions();
  const palette = size ? scenePaletteCached(liquidGlassThemeId, liquidGlassAppearance, 'dialogs', size.w * dpr, size.h * dpr, dpr) : null;
  if (palette && size) logSceneEdge('dialogs', { sceneH: size.h, sceneW: size.w, windowH: Math.round(windowH), shareOfWindow: Math.round((size.h / windowH) * 100), bottomRadius: 28, fadeToBg: false, themeId: liquidGlassThemeId, appearance: liquidGlassAppearance, mode: palette.mode, source: 'scenePalette' }); // guard-ok: журнал края сцены
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {palette ? (
        <SceneBackdrop palette={palette} idPrefix={idPrefix} />
      ) : (
        <LinearGradient pointerEvents="none" colors={[c.top, mixPremiumHex(c.top, c.bottom, 0.5), mixPremiumHex(c.top, c.bottom, 0.5)]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

export default memo(DialogsSceneBackdrop);

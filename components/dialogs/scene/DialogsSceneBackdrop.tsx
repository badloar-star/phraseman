// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneBackdrop.tsx — подложка «Сцены» «Диалогов»: утверждённая сцена (тёмное «Глубокое небо», светлое «А») из scenePalette.
//
// зачем (вердикт владельца 29.10: «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, все экраны»; закрывает и чёрные пятна светлых grad_*: свечений из
// прозрачного цвета больше нет вовсе): одна и та же подложка у сцены хаба и у верха листа согласия (DialogsConsentTop) — рисует общий SceneBackdrop по реальному размеру
// области. До первой раскладки (размера ещё нет) показывает вертикальный градиент «зенит → низ» тех же цветов, чтобы первый кадр не был пустым (colors.top/bottom теперь
// тоже из scenePalette). idPrefix разводит id градиентов, когда две подложки на экране. Касаний не ловит, заполняет родителя (absoluteFill).
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useState } from 'react';
import { PixelRatio, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

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
  const palette = size ? scenePaletteCached(liquidGlassThemeId, liquidGlassAppearance, 'dialogs', size.w * dpr, size.h * dpr, dpr) : null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {palette ? (
        <SceneBackdrop palette={palette} idPrefix={idPrefix} />
      ) : (
        <LinearGradient pointerEvents="none" colors={[c.top, c.bottom]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

export default memo(DialogsSceneBackdrop);

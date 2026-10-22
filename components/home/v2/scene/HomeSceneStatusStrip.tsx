// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneStatusStrip.tsx — полоса под строкой статуса цветом «Сцены», только над Главной.
//
// зачем (координатор 22.10: тон полосы статуса — только на вкладке Главной, другие вкладки не задеть; эталон
// home-new-concepts.html: сцена уходит «под часы»): оболочка вкладок держит отступ сверху, и над сценой оставалась полоса
// фона экрана. Полоса берёт верхний цвет сцены (home_scene_status_tint) и гаснет, пока Главная прокручивается вниз
// (120 dp), — дальше верх экрана такой же, как на других вкладках. Сцены нет или не Главная — ничего не рисуется.
// Анимация — интерполяция того же Animated.Value прокрутки, что у маски верха (без своих подписок и setState).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useHomeSceneStatusTint } from './home_scene_status_tint';

const FADE_DISTANCE = 120;

type Props = Readonly<{ height: number; scrollY?: Animated.Value; visible: boolean }>;

function HomeSceneStatusStrip({ height, scrollY, visible }: Props) {
  const tint = useHomeSceneStatusTint();
  if (!visible || tint === null || height <= 0) return null;
  const opacity = scrollY ? scrollY.interpolate({ inputRange: [0, FADE_DISTANCE], outputRange: [1, 0], extrapolate: 'clamp' }) : 1;
  return <Animated.View testID="home-scene-status-strip" pointerEvents="none" style={[s.strip, { height, backgroundColor: tint, opacity }]} />;
}

export default memo(HomeSceneStatusStrip);

const s = StyleSheet.create({
  strip: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 1 },
});

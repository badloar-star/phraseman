// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneStatusStrip.tsx — полоса под строкой статуса цветом «Сцены», только над Главной.
//
// зачем (координатор 22.10: тон полосы статуса — только на вкладке Главной, другие вкладки не задеть; эталон
// home-new-concepts.html: сцена уходит «под часы»): оболочка вкладок держит отступ сверху, и над сценой оставалась полоса
// фона экрана. Полоса берёт верхний цвет сцены (home_scene_status_tint) и гаснет, пока Главная прокручивается вниз
// (120 dp), — дальше верх экрана такой же, как на других вкладках. Сцены нет или не Главная — ничего не рисуется.
// Анимация — интерполяция того же Animated.Value прокрутки, что у маски верха (без своих подписок и setState).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { SPIRE_SCENE_V2_ENABLED } from '../../../spire/scene/spire_scene_flag';
import { useSpireSceneHeaderTint } from '../../../spire/scene/spire_scene_header_tint';
import { useHomeSceneStatusTint } from './home_scene_status_tint';

const FADE_DISTANCE = 120;

type Props = Readonly<{
  height: number;
  scrollY?: Animated.Value;
  visible: boolean;
  /** Чей верхний цвет: «Сцены» Главной (по умолчанию) или «Сцены» Пика на вкладке «Сообщество» (только при SPIRE_SCENE_V2_ENABLED). */
  source?: 'home' | 'spire';
}>;

function HomeSceneStatusStrip({ height, scrollY, visible, source = 'home' }: Props) {
  const homeTint = useHomeSceneStatusTint();
  const spireTint = useSpireSceneHeaderTint();
  // зачем (Пик v2, координатор 22.10: «тем же механизмом, что HomeSceneStatusStrip, без второй копии»): одна полоса на Главной и на «Пике»
  const tint = source === 'spire' ? (SPIRE_SCENE_V2_ENABLED ? spireTint : null) : homeTint;
  // зачем (владелец 22.10 «полоса другого цвета в сейф-зоне — запрещаю»): сперва факты — рисуется ли полоса над часами, каким цветом и почему нет.
  const decision = !visible ? 'skip_not_active_tab' : tint === null ? 'skip_no_scene_tint' : height <= 0 ? 'skip_zero_inset' : 'draw';
  useEffect(() => {
    console.log('[SAFE-TOP]', JSON.stringify({ at: 'status_strip', source, visible, tint, height: Math.round(height), spireFlag: SPIRE_SCENE_V2_ENABLED, decision })); // guard-ok: одна строка на смену решения
  }, [source, visible, tint, height, decision]);
  if (decision !== 'draw' || tint === null) return null;
  const opacity = scrollY ? scrollY.interpolate({ inputRange: [0, FADE_DISTANCE], outputRange: [1, 0], extrapolate: 'clamp' }) : 1;
  return <Animated.View testID={source === 'spire' ? 'spire-scene-status-strip' : 'home-scene-status-strip'} pointerEvents="none" style={[s.strip, { height, backgroundColor: tint, opacity }]} />;
}

export default memo(HomeSceneStatusStrip);

const s = StyleSheet.create({
  strip: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 1 },
});

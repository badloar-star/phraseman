// ═══════════════════════════════════════════════════════════════════════════
// SpireSceneStatusStrip.tsx — полоса под строкой статуса цветом «Сцены» Пика, только на вкладке «Сообщество».
//
// зачем (Пик v2, шаг 3b-2; эталон peak-scene-v2.html: сцена уходит «под часы»): оболочка вкладок держит отступ сверху, и над шапкой
// «Сообщества» оставалась полоса фона экрана. Полоса берёт верхний цвет сцены (spire_scene_header_tint), пока «Пик» со «Сценой» на экране;
// нет цвета — ничего не рисуется. Без своих подписок на прокрутку: шапка «Сообщества» тоже стоит на месте.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSpireSceneHeaderTint } from './spire_scene_header_tint';

type Props = Readonly<{ height: number; visible: boolean }>;

function SpireSceneStatusStrip({ height, visible }: Props) {
  const tint = useSpireSceneHeaderTint();
  if (!visible || tint === null || height <= 0) return null;
  return <View testID="spire-scene-status-strip" pointerEvents="none" style={[s.strip, { height, backgroundColor: tint }]} />;
}

export default memo(SpireSceneStatusStrip);

const s = StyleSheet.create({
  strip: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 1 },
});

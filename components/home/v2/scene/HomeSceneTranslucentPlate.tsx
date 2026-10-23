// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneTranslucentPlate.tsx — тень и заливка ПОЛУПРОЗРАЧНОЙ плашки сцены Главной («Фраза дня»): маска тени с вырезом позади,
// заливка 50 % поверх отдельным слоем.
//
// зачем (ускорение первого кадра Главной; маски с вырезом 4 · ТЕМЫ 4e6896eb1; координатор 22.10): размытая boxShadow плашки
// компилирует шейдер на первом кадре — вместо неё запечённая маска той же тени. Плашка Главной полупрозрачна (заливка 50 %, приказ
// владельца 11.10), поэтому маска с ВЫРЕЗОМ: под плашкой альфа 0, тень не просвечивает сквозь заливку (как и у boxShadow, которая
// рисуется только снаружи). Цвет тени — как у useHomePlateStyle: в светлых усилен ×1,35 (HOME_LIGHT_SHADOW_BOOST). Итоговый кадр —
// прежний (Сверка до/после). Лёгкий режим — без тени, как и прежде (HomeScenePlateShadow).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useShadowGlass } from '../../../v2/ShadowSurface';
import { HOME_LIGHT_SHADOW_BOOST, boostColorAlpha, homePlateFill } from '../homePlate';
import HomeScenePlateShadow from './HomeScenePlateShadow';

type Props = Readonly<{
  /** Маска с вырезом под форму плашки (набор 4 · ТЕМЫ). */
  kind: 'phraseCutout';
  /** Скругление плашки — заливка повторяет форму. */
  radius: number;
}>;

/** Заливка — по размеру плашки (без StyleSheet: минимальная подмена react-native в тестах). */
const FILL: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };

function HomeSceneTranslucentPlate({ kind, radius }: Props) {
  const g = useShadowGlass();
  const boost = g.isLight ? HOME_LIGHT_SHADOW_BOOST : 1;
  return (
    <>
      <HomeScenePlateShadow kind={kind} isLight={g.isLight} shadow={boostColorAlpha(g.plateShadow, boost)} shadowSoft={boostColorAlpha(g.plateShadowSoft, boost)} />
      <View pointerEvents="none" style={[FILL, { borderRadius: radius, backgroundColor: homePlateFill(g) }]} />
    </>
  );
}

export default memo(HomeSceneTranslucentPlate);

// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerDeferred.tsx — SpireTowerSvg, который встаёт следующим кадром после экрана.
//
// зачем (координатор 29.10, разбор JS-стопа на «Пике»): монтаж башни (~500 узлов SVG) в кадре появления экрана давал всплеск сборок мусора и рывок.
// Пока флаг (use_spire_tower_ready) не взведён, рисуем пустую рамку ТОГО ЖЕ размера (spireTowerSvgHeight) — раскладка не сдвигается, вид после монтажа
// прежний. Рамка без касаний и не читается дикторами: башня-иллюстрация, подписей у неё и так нет. Вызывать вместо SpireTowerSvg там, где башня
// встаёт вместе с экраном (кадр «peak» объявления, «Итог недели», тур, истории Пика). На самом экране Пика и в окнах, где башня уже собирается заранее
// (MomentPromotion prep3, SpireFloorMoment towerReady), не нужен.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { View } from 'react-native';

import SpireTowerSvg, { spireTowerSvgHeight, type SpireTowerSvgProps } from './SpireTowerSvg';
import { useSpireTowerReady } from './use_spire_tower_ready';

type Props = SpireTowerSvgProps & Readonly<{ /** Метка для журнала: кто показывает башню. */ source: string }>;

function SpireTowerDeferred({ source, ...tower }: Props) {
  const ready = useSpireTowerReady(source);
  if (!ready) {
    return (
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ width: tower.width, height: spireTowerSvgHeight(tower) }}
        testID="spire-tower-placeholder"
      />
    );
  }
  return <SpireTowerSvg {...tower} />;
}

export default memo(SpireTowerDeferred);

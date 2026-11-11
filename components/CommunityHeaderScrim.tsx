import React, { memo } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { LinearGradient } from './SafeLinearGradient';
import { useTopFadeScrolled } from './useTopFadeScrolled';

/** Мягкий нижний край полосы — та же высота растворения, что у списков (ScrollTopEdgeFade). */
const FEATHER = 20;

type Props = Readonly<{
  /** Высота шапки «Сообщества» вместе с зоной часов. */
  headerHeight: number;
  /** Цвет верха сцены раздела. */
  tint: string;
}>;

function transparentOf(color: string): string {
  // зачем: 'transparent' в градиенте — это чёрный с нулевой альфой, переход даёт серую грязь; нужен тот же цвет с альфой 0
  if (/^#[\da-f]{6}$/i.test(color)) return `${color}00`;
  if (/^#[\da-f]{8}$/i.test(color)) return `${color.slice(0, 7)}00`;
  const rgb = /^rgba?\(([^,]+),([^,]+),([^,)]+)/.exec(color);
  return rgb ? `rgba(${rgb[1].trim()},${rgb[2].trim()},${rgb[3].trim()},0)` : 'transparent';
}

/**
 * Полоса цвета сцены под вкладками «Сообщества», когда шапка лежит поверх «Сцены» («Наборы», «Пик») и раздел прокручен.
 *
 * зачем (владелец 11.11: «в наборах надо добавить, потому что там при скролле верхняя часть просто накладывается»; то же на «Пике»):
 * шапка там прозрачная и абсолютная, плашки при прокрутке шли прямо под текст вкладок и часы. Полоса цветом верха сцены с мягким
 * нижним краем появляется только после начала прокрутки (порог и длительности общей верхней маски) — плашки растворяются под ней,
 * белые вкладки и значки строки состояния остаются читаемыми в любой теме. В покое полосы нет: сцена идёт от самого верха, как
 * требует замок «верх цельный» (25.10). Касания проходят насквозь.
 */
function CommunityHeaderScrim({ headerHeight, tint }: Props) {
  const opacity = useTopFadeScrolled({ rest: 0 });
  if (headerHeight <= 0) return null;
  const height = headerHeight + FEATHER;
  return (
    <Animated.View testID="community-header-scrim" pointerEvents="none" style={[s.scrim, { height, opacity }]}>
      <LinearGradient colors={[tint, tint, transparentOf(tint)]} locations={[0, headerHeight / height, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default memo(CommunityHeaderScrim);

const s = StyleSheet.create({
  // выше тела (bodyUnder), ниже шапки (headerOver: zIndex 2)
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
});

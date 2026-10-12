// зачем (находка Тем по ночным кадрам, learn-007; координатор 13.10): список уроков листается под полем поиска, а верхний край списка — жёсткий срез: карточка обрезана прямой линией
// вплотную к полю, без подложки и без перехода. Здесь — мягкое растворение верхних 16 px списка цветом фона темы (`bgTop`, тот же, что берёт TopFadeMask).
// Появляется только после прокрутки (scrollY > 6), чтобы в покое не затемнять заголовок «A1» и первую строку. Без MaskedView: маска на прокручиваемом списке дорогая; здесь один статичный градиент.
import React, { memo, useMemo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { alphaHex } from '../../constants/v2Style';

export const LIST_TOP_EDGE_FADE_HEIGHT = 16;
/** Порог прокрутки, с которого срез считается «под шапкой»: до него список в покое. */
export const LIST_TOP_EDGE_FADE_SHOW_AT = 6;

type Props = Readonly<{
  g: Pick<GlassTokens, 'bgTop'>;
  /** Общий вертикальный офсет активного таба (TopFadeScrollContext). */
  scrollY: Animated.Value;
}>;

function ListTopEdgeFadeBase({ g, scrollY }: Props) {
  const opacity = useMemo(
    () => scrollY.interpolate({ inputRange: [0, LIST_TOP_EDGE_FADE_SHOW_AT, LIST_TOP_EDGE_FADE_SHOW_AT + 18], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
    [scrollY],
  );
  const colors = useMemo(() => [alphaHex(g.bgTop, 0.96), alphaHex(g.bgTop, 0)] as const, [g.bgTop]);
  return (
    <Animated.View testID="lessons-list-top-edge-fade" pointerEvents="none" style={[styles.fade, { opacity }]}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default memo(ListTopEdgeFadeBase);

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, left: 0, right: 0, height: LIST_TOP_EDGE_FADE_HEIGHT, zIndex: 2 },
});

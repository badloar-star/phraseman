/**
 * Залипающая полоса над сеткой карточек, в которой живёт поле поиска «Сохранённых».
 *
 * зачем (владелец 22.10: ползунок масштаба убран): поле поиска раньше лежало внутри полосы ZoomBar (макет cards-v2, `.zbar`) и липло к верху вместе с ней. ZoomBar удалён,
 * а место и вид полосы остаются прежними: тот же плотный фон-градиент (верх FF — сквозь неё не просвечивают карточки, R1_DIFF_ONE_FIX cards-005), поля 20 и отступы 10/12.
 * Нет поля поиска — полоса пустая и высоты не занимает.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../SafeLinearGradient';

type Props = Readonly<{
  g: GlassTokens;
  /** Поле поиска (кадр «Поиск»); null — полосе нечего держать. */
  search: React.ReactNode | null;
}>;

function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? `${color}${alphaHex}` : color;
}

function StickySearchBarInner({ g, search }: Props) {
  if (!search) return <View testID="fc-sticky-search-empty" />;
  const bg = g.bg;
  return (
    <View testID="fc-sticky-search" style={styles.bar}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(bg, 'FF'), withAlpha(bg, 'FF'), withAlpha(bg, '00')]} locations={[0, 0.72, 1]} style={StyleSheet.absoluteFill} />
      {search}
    </View>
  );
}

export const StickySearchBar = memo(StickySearchBarInner);

const styles = StyleSheet.create({
  bar: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
});

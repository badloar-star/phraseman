import { Image } from 'expo-image';
import React, { memo } from 'react';
import { type ImageStyle, type StyleProp, type TextStyle } from 'react-native';

import { MyRankCoin } from './rank/MyRankCoin'; // зачем (слово владельца 05.11): монета строго по рангу пользователя, не фиксированная базовая

/**
 * Значок валюты для статичных счётчиков и подписей.
 *
 * зачем (владелец 01.10): валюта 2.0 — монеты, руны удалены. Раньше здесь был
 * рунический символ ᚠ; теперь — картинка монеты (та же, что в балансе и наградах).
 * Имя компонента прежнее, чтобы не трогать все места вызова; `color` больше не
 * нужен картинке, но остаётся в пропсах для совместимости вызовов.
 */

interface Props {
  /** Размер значка. Совпадает с размером иконки, которую он заменил. */
  size: number;
  /** Не используется картинкой; оставлен для совместимости вызовов. */
  color?: string;
  style?: StyleProp<TextStyle | ImageStyle>;
}

export const RuneGlyph = memo(function RuneGlyph({ size, style }: Props) {
  return (
    <MyRankCoin
      // Значок декоративен: смысл несёт число рядом и accessibilityLabel родителя.
      accessible={false}
      contentFit="contain"
      style={[{ width: size, height: size }, style as StyleProp<ImageStyle>]}
    />
  );
});

export default RuneGlyph;

import React, { memo } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { RUNE_GLYPH_PRIMARY } from '../constants/runes';

/**
 * Глиф валюты «руны» для статичных счётчиков и подписей.
 *
 * зачем (владелец, 22.08 + 23.08): вместо Ionicons "star" валюта показывается
 * руническим символом старшего футарка. В счётчиках всегда ОДНА «дежурная»
 * руна ᚠ — случайный глиф заставлял бы цифру «прыгать» при каждом ре-рендере;
 * разные символы живут только в анимации начисления (LearningV2RuneFlight).
 *
 * Символ — обычный текст: системные шрифты его содержат, ассеты не нужны.
 * Цвет обязателен и приходит из токенов темы — золотой не хардкодится.
 */

interface Props {
  /** Кегль глифа. Совпадает с размером иконки, которую он заменил. */
  size: number;
  /** Цвет из токенов темы (t.gold, P.onGold и т.п.). */
  color: string;
  style?: TextStyle;
}

export const RuneGlyph = memo(function RuneGlyph({ size, color, style }: Props) {
  return (
    <Text
      allowFontScaling={false}
      // Глиф декоративен: смысл несёт число рядом и accessibilityLabel родителя.
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.glyph,
        { fontSize: size, lineHeight: Math.round(size * 1.16), color },
        style,
      ]}
    >
      {RUNE_GLYPH_PRIMARY}
    </Text>
  );
});

const styles = StyleSheet.create({
  glyph: { fontWeight: '700', textAlign: 'center' },
});

export default RuneGlyph;

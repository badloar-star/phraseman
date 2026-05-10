import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from './ThemeContext';

/** Маркеры в данных: `___` (часто) и `__` (напр. тренажёр предлогов). */
const CLOZE_GAP_RE = /(___|__)/g;

function isGapSegment(s: string): boolean {
  return s === '___' || s === '__';
}

type Props = {
  text: string;
  style: TextStyle;
  /** Пропуски: по умолчанию акцент темы, чтобы отличались от основного текста. */
  gapColor?: string;
} & Omit<TextProps, 'style' | 'children'>;

/**
 * Текст вопроса с пропуском: подчёркивания окрашиваются цветом темы (акцент).
 */
export default function ClozeGapText({ text, style, gapColor: gapColorProp, ...rest }: Props) {
  const { theme: t } = useTheme();
  const gapColor = gapColorProp ?? t.accent;

  if (!text.includes('__')) {
    return (
      <Text style={style} {...rest}>
        {text}
      </Text>
    );
  }

  const parts = text.split(CLOZE_GAP_RE);
  return (
    <Text style={style} {...rest}>
      {parts.map((part, i) =>
        isGapSegment(part) ? (
          <Text key={i} style={[style, { color: gapColor, fontWeight: '800' }]}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

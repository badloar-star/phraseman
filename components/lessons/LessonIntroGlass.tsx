import React from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

// зачем (владелец 2026-09-29): интро урока переносится «1 в 1» по learn.html C1–C3.
// В макете примеры лежат не в цветной рамке с зелёным английским, а строками: английский 17/600
// слева, перевод 15 справа, между строками тонкая линия. Презентационная часть примеров
// вынесена сюда из app/lesson_intro_screens.tsx; цвета — только токены 13 тем Liquid Glass.

export type LessonIntroGlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Стиль английской строки примера (17/22, 600) — общий для простого и rich-варианта. */
export function introExampleEnStyle(glass: LessonIntroGlassTokens): TextStyle {
  return { color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' };
}

/** Одна строка примера: английский слева, перевод справа, сверху тонкая разделительная линия. */
export function LessonIntroExampleRow({
  glass,
  first,
  label,
  note,
  english,
  translation,
}: {
  glass: LessonIntroGlassTokens;
  first: boolean;
  label?: string;
  note?: string;
  english: React.ReactNode;
  translation: string;
}) {
  const translationStyle: StyleProp<TextStyle> = {
    color: glass.secondary,
    fontSize: 16,
    lineHeight: 21,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '48%',
  };
  return (
    <View
      style={{
        marginTop: first ? 14 : 10,
        paddingTop: 10,
        borderTopWidth: 1, // guard-ok: разделитель одной стороны, как .ex в макете
        borderTopColor: glass.line,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <View style={{ flexShrink: 1, flexGrow: 1, minWidth: 0 }}>
        {label ? (
          <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 17, marginBottom: 2 }}>{label}</Text> // guard-ok: метка примера из данных урока, не расшифровка
        ) : null}
        {english}
        {note ? (
          <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 3 }}>{note}</Text> // guard-ok: примечание примера из данных урока
        ) : null}
      </View>
      {translation ? <Text style={translationStyle}>{translation}</Text> : null}
    </View>
  );
}

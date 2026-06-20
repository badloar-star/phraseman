import React, { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { segmentBilingual } from '../app/bilingual_segments';

// ── Двухцветный разбор: ключевой язык (английский) ≠ язык перевода ──────────────
// ИИ-разбор ошибки/объяснение возвращается одной строкой, где английские слова
// (то, чему учим) перемешаны с текстом на родном языке. Раньше всё рисовалось
// одним цветом и сливалось. Здесь мы красим английский акцентным цветом темы, а
// перевод — обычным. Контраст гарантирован в любой теме, разметка от ИИ не нужна.
// Сегментация вынесена в app/bilingual_segments.ts (чистая, тестируемая).

type BilingualMistakeTextProps = {
  text: string;
  /** Цвет английского (ключевого) языка — обычно t.accent. */
  englishColor: string;
  /** Цвет родного языка (перевод) — обычно t.textSecond. */
  nativeColor: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * Рендерит разбор так, что английские слова всегда отличаются по цвету от текста
 * на родном языке. Английский — акцентным цветом и жирнее (выделен), перевод —
 * обычным. Один внешний <Text> с вложенными цветными кусками: перенос строк и
 * выравнивание работают как у обычного текста.
 */
export default function BilingualMistakeText({
  text,
  englishColor,
  nativeColor,
  style,
  testID,
}: BilingualMistakeTextProps) {
  const segments = useMemo(() => segmentBilingual(text), [text]);
  return (
    <Text testID={testID} style={[{ color: nativeColor }, style]}>
      {segments.map((seg, i) =>
        seg.english ? (
          <Text key={i} style={[styles.english, { color: englishColor }]}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i} style={{ color: nativeColor }}>
            {seg.text}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  english: {
    fontWeight: '800',
  },
});

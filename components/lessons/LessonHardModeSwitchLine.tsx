// LessonHardModeSwitchLine.tsx — тихая строка под полем ввода классического урока: «Печатаешь вручную · Выбирать слова».
// зачем (жалоба №4, координатор 25.10, вариант А макета hardmode-switch-line.html): при включённом «Вводе с клавиатуры» новичок видел поле вместо
// плиток и не знал почему. Строка видна всегда, пока режим включён; тап выключает настройку на месте. Отдельный компонент — чтобы владелец
// мог переставить её в вариант Б (в строку подписи задания) одной правкой места.
// Кегль 13 — шкала D145 (16/13), в макете 14: расхождение отмечено координатору.
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { lessonHardModeSwitchText } from './lesson_hardmode_switch_copy';

type Props = Readonly<{
  lang: string;
  /** Тихий цвет первой части (что включено). */
  mutedColor: string;
  /** Цвет темы как текст — действие «Выбирать слова». */
  actionColor: string;
  onSwitch: () => void;
}>;

function LessonHardModeSwitchLine({ lang, mutedColor, actionColor, onSwitch }: Props) {
  const state = lessonHardModeSwitchText(lang, 'state');
  const action = lessonHardModeSwitchText(lang, 'action');
  return (
    <Pressable
      testID="lesson1-hardmode-switch"
      accessibilityRole="button"
      accessibilityLabel={`${state}. ${action}`}
      hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      onPress={onSwitch}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.text, { color: mutedColor }]} numberOfLines={1}>
        {state}
        {' · '}
        <Text style={[styles.action, { color: actionColor }]}>{action}</Text>
      </Text>
    </Pressable>
  );
}

export default memo(LessonHardModeSwitchLine);

const styles = StyleSheet.create({
  row: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  pressed: { opacity: 0.6 },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '400', textAlign: 'center' }, // guard-ok: строка-действие по утверждённому макету, не подпись под названием
  action: { fontWeight: '700' },
});

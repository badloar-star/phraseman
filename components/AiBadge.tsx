/**
 * AiBadge — маленькая плашка «AI» рядом с заголовком карточки/модалки.
 *
 * Прозрачный маркер «этот блок сгенерирован ИИ», требуемый рядом с
 * AiMistakeCard и MistakeEli5Modal. Тон, не обводка (владелец: контейнеры
 * без borderColor/borderWidth) — заливка accent с пониженной непрозрачностью.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

export default function AiBadge() {
  const { theme: t, f } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: `${t.accent}22` }]} accessibilityElementsHidden>
      <Text style={[styles.text, { color: t.accent, fontSize: Math.max(10, f.label - 1) }]}>AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});

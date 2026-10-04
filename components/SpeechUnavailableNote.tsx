import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../constants/i18n';
import { speechUnavailableOnDeviceText } from '../app/speech_device_availability';

/**
 * Спокойная строка «Распознавание речи не работает на этом устройстве» (§SPEECH-NA).
 *
 * зачем: одно и то же сообщение на всех голосовых местах, одним видом —
 * перечёркнутый микрофон + текст приглушённым тоном. Без обводки и без
 * подписи-расшифровки: сам текст и есть сообщение. Цвет даёт хост из своей
 * палитры, чтобы строка сидела в любом экране (уроки, карточки, ошибки).
 */
export default function SpeechUnavailableNote({
  lang,
  color,
  background,
  style,
  testID = 'speech-unavailable-note',
}: {
  lang: Lang;
  color: string;
  /** Подложка тоном (по желанию хоста). Без неё — строка без фона. */
  background?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const text = speechUnavailableOnDeviceText(lang);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      style={[styles.row, background ? { backgroundColor: background, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 } : null, style]}
    >
      <Ionicons name="mic-off-outline" size={18} color={color} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  text: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
});

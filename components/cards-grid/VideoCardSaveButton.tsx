import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { hapticTap } from '../../hooks/use-haptics';

/**
 * Кнопка-закладка «Сохранить / Сохранено» на отдельной карточке из видео (владелец 18.10: сохранять можно только те карточки, которые сам хочешь, а не весь набор).
 * зачем: одна и та же кнопка во всех местах с карточками из видео. Круглая, 34 (как «озвучить»), закладка пустая → заполненная; цвета и подложку места передаёт вызывающий (токены темы места).
 * Нажатие — сжатие 0,92 (kit), вибрация как у управляющих кнопок; сама логика (мгновенно, откат, двойной тап) — в useVideoCardSave.
 */
export const VideoCardSaveButton = memo(function VideoCardSaveButton({ saved, onPress, saveLabel, savedLabel, ink, savedInk, backgroundColor, boxShadow, testID, size = 34, style }: Readonly<{
  saved: boolean;
  onPress: () => void;
  saveLabel: string;
  savedLabel: string;
  ink: string;
  /** Цвет заполненной закладки (акцент места); по умолчанию как у пустой. */
  savedInk?: string;
  backgroundColor: string;
  boxShadow?: ViewStyle['boxShadow'];
  testID?: string;
  size?: number;
  style?: ViewStyle;
}>) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={saved ? savedLabel : saveLabel}
      accessibilityState={{ selected: saved }}
      hitSlop={6}
      onPress={() => { void hapticTap(); onPress(); }}
      style={({ pressed }) => [styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor }, boxShadow ? { boxShadow } : null, pressed && styles.pressed, style]}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={Math.round(size * 0.5)} color={saved ? (savedInk ?? ink) : ink} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.92 }] },
});

export default VideoCardSaveButton;

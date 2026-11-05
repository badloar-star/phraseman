// зачем (раунд 2 удобств, Настройки п.5, одобрено владельцем 05.11): после смены темы — плашка «Вернуть прежнюю» на 5 секунд: попробовал, не понравилось — вернул одним тапом.
// Плашка живёт на экране «Темы» сама (без глобального тоста и без Firestore), без обводки: отделена тоном и малой тенью. Подпись — глагол действия, без расшифровок.
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { triLang, type Lang } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/** Сколько плашка висит после смены темы (мс). */
export const THEME_UNDO_VISIBLE_MS = 5000;

export const THEME_UNDO_LABEL = {
  ru: 'Вернуть прежнюю', uk: 'Повернути попередню', en: 'Restore previous', es: 'Volver a la anterior',
  'pt-BR': 'Voltar à anterior', vi: 'Hoàn tác', id: 'Kembalikan yang lama', tr: 'Öncekini geri al', pl: 'Przywróć poprzedni',
} as const;

type Props = Readonly<{
  glass: GlassTokens;
  lang: Lang;
  bottomInset: number;
  onUndo: () => void;
}>;

function ThemeUndoBarBase({ glass, lang, bottomInset, onUndo }: Props) {
  const label = triLang(lang, THEME_UNDO_LABEL);
  // зачем (Reduce Motion, ТОП-20 доступности, 05.11): при «Уменьшить движение» плашка появляется и уходит без въезда
  const reduceMotion = useReduceMotion();
  return (
    <View pointerEvents="box-none" style={[styles.zone, { bottom: bottomInset + 20 }]}>
      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(220)} exiting={reduceMotion ? undefined : FadeOut.duration(160)}>
        <Pressable
          testID="theme-undo"
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onUndo}
          hitSlop={6}
          style={({ pressed }) => [styles.bar, { backgroundColor: glass.opaqueSheet, boxShadow: nestedBoxShadow(glass) }, pressed ? styles.pressed : null]}
        >
          <Ionicons name="arrow-undo" size={18} color={glass.text} />
          <Text maxFontSizeMultiplier={1.15} style={[styles.text, { color: glass.text }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export const ThemeUndoBar = memo(ThemeUndoBarBase);

const styles = StyleSheet.create({
  zone: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 20, borderRadius: 24 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
